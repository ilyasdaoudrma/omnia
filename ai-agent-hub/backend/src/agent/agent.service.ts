import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { User } from '@prisma/client';
import { AIService } from '../ai/ai.service';
import { ToolsService, TOOLS } from '../tools/tools.service';
import { ConversationsService } from '../conversations/conversations.service';
import { buildCheckout, buildMenuView } from './checkout.builder';
import { buildManage } from './manage.builder';
import { detectRecurrence, labelForDrafts, stripSchedule, type RecurrenceIntent } from './recurrence.builder';
import { RecurrencesService, scheduleLabel } from '../recurrences/recurrences.service';
import type { AgentEvent, AgentStep, AgentTask, CheckoutDraft, ClarifyRequest, ManageAction, MenuView, Recommendation, RecurrenceView, RunRequest, ToolResult, ToolId, TripPlan } from '../ai/agent.types';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
/** Pluralize a count + noun naturally: 1 night, 2 nights. */
const plural = (n: number, w: string): string => `${n} ${w}${n === 1 ? '' : 's'}`;

// Any OMNIA-domain signal in the prompt/history — used to gate recommendation cards
// so an off-topic refusal ("write me a poem") never appends marketplace results.
const DOMAIN_HINT =
  /\b(food|eat|eating|restaurants?|dinner|lunch|breakfast|meal|dish|menu|pizza|burger|sushi|tagine|tajine|couscous|drink|coffee|order|stay|stays?|hotel|riad|apartment|villa|studio|guesthouse|room|nights?|book|booking|reserve|ride|rides?|taxi|cab|car|driver|airport|trip|travel|vacation|holiday|weekend|napoli|sakura|smashed|dar\s*tagine|green\s*bowl|rabat|casa(?:blanca)?|marrakech|marrakesh|tanger|tangier|oujda|agadir)\b/i;

/**
 * Orchestrates the agent loop:
 *   plan → (tool selection + execution) → streamed answer → recommendations → persist
 * Emits AgentEvents consumed identically by the chat UI and Activity Center.
 *
 * Stateless across requests — all per-run state is local, so concurrent users
 * never interfere.
 */
@Injectable()
export class AgentService {
  private readonly logger = new Logger(AgentService.name);

  constructor(
    private readonly ai: AIService,
    private readonly tools: ToolsService,
    private readonly conversations: ConversationsService,
    private readonly recurrences: RecurrencesService,
  ) {}

  async *run(req: RunRequest, user: User | null): AsyncGenerator<AgentEvent> {
    const provider = this.ai.forRequest(req.provider);
    const prompt = req.prompt.trim();

    try {
      const conversationId = await this.conversations.ensureConversation(user, req.conversationId, prompt);
      await this.conversations.appendUserMessage(conversationId, prompt);

      // 0) Recurring-task fast path: "order my usual every Friday", "what are my
      //    recurring tasks", "stop my weekly ride". Must run before the one-off
      //    manage/checkout paths (which would otherwise place it immediately).
      const recIntent = detectRecurrence(prompt);
      if (recIntent) {
        yield* this.runRecurrence(recIntent, prompt, req, user, conversationId, provider);
        return;
      }

      // 0a) Manage fast path: requests against an EXISTING order/booking —
      //     cancel, modify a stay's nights/guests, or reorder "my usual".
      const manage = await buildManage(this.tools, prompt, req.account, req.location);
      if (manage) {
        if (manage.kind === 'reorder') {
          yield* this.runCheckout(manage.drafts, conversationId);
        } else if (manage.kind === 'action') {
          yield* this.runManage(manage.action, conversationId);
        } else {
          yield* this.runMessage(manage.text, conversationId);
        }
        return;
      }

      // 0b) Direct-action fast path: if the user gave a concrete order/booking
      //    ("order a pizza and a coke from Sakura"), assemble a confirm-ready
      //    checkout instead of just listing options. If the follow-up is too
      //    ambiguous to assemble safely, ask a quick clarifying question first.
      const outcome = await buildCheckout(provider, this.tools, prompt, req.location, req.history);
      if (outcome?.kind === 'clarify') {
        yield* this.runClarify(outcome.clarify, conversationId);
        return;
      }
      if (outcome?.kind === 'message') {
        // e.g. "we don't serve that city" — a plain, streamed reply, no checkout.
        yield* this.runMessage(outcome.text, conversationId);
        return;
      }
      if (outcome?.kind === 'drafts') {
        yield* this.runCheckout(outcome.drafts, conversationId, outcome.trip);
        return;
      }

      // 0c) Menu view: "show me the menu of Napoli" → render that vendor's live
      //     menu as a VISUAL card so the user can tap-to-order or say what they want.
      const menu = await buildMenuView(this.tools, prompt, req.history, req.location);
      if (menu) {
        yield* this.runMenu(menu, conversationId);
        return;
      }

      // 1) Planner agent decomposes the request.
      const plannerStep = newStep('Planner agent', 'Decomposing your request', undefined);
      yield { type: 'step', step: plannerStep };
      const plan = await provider.plan(prompt, req.history);
      const tasks: AgentTask[] = plan.tasks.map((t) => ({ id: randomUUID(), title: t.title, tool: t.tool, status: 'pending' }));
      yield { type: 'plan', tasks };
      yield { type: 'step_update', id: plannerStep.id, status: 'done', detail: `Decomposed into ${tasks.length} tasks` };

      // 2) Execute tools task by task; one live call per unique tool.
      const toolResults: ToolResult[] = [];
      const executed = new Map<ToolId, ToolResult>();

      for (const task of tasks) {
        const step = newStep(`${TOOLS[task.tool].name} tool`, task.title, task.tool);
        yield { type: 'step', step };
        yield { type: 'step_update', id: task.id, status: 'running' };

        await sleep(350);
        let result = executed.get(task.tool);
        if (!result) {
          result = await this.tools.execute(task.tool, prompt, req.location);
          executed.set(task.tool, result);
          toolResults.push(result);
        }

        yield { type: 'step_update', id: step.id, status: 'done', detail: result.summary };
        yield { type: 'step_update', id: task.id, status: 'done' };
      }

      // 3) Stream the assistant's natural-language answer (with location context).
      const answerPrompt = req.location?.city ? `${prompt}\n\n(The user is currently in ${req.location.city}.)` : prompt;
      let answer = '';
      for await (const token of provider.streamAnswer(answerPrompt, req.history, toolResults)) {
        answer += token;
        yield { type: 'token', text: token };
      }

      // 4) Surface aggregated, ranked recommendations — but ONLY when THIS message is
      // actually asking about our domain. Gate on the current prompt (not history): an
      // off-topic ("write me a poem") or meta ("what do you know about me?") question
      // in a food-heavy chat must not append stale stay/food cards. Browse follow-ups
      // that name no domain word ("show me more") go through the checkout fast-path, so
      // they don't reach here.
      const recommendations = DOMAIN_HINT.test(prompt) ? aggregate(toolResults) : [];
      if (recommendations.length) yield { type: 'recommendations', items: recommendations };

      // 5) Persist and close.
      const doneTasks: AgentTask[] = tasks.map((t) => ({ ...t, status: 'done' }));
      const messageId = await this.conversations.appendAssistantMessage(conversationId, answer, recommendations, doneTasks);
      yield { type: 'done', messageId, conversationId: conversationId ?? undefined };
    } catch (err) {
      this.logger.error(`Agent run failed: ${(err as Error).message}`, (err as Error).stack);
      yield { type: 'error', message: 'The agent hit a problem completing this request. Please try again.' };
    }
  }

  /**
   * Handles recurring-task intents: schedule a new one, list the user's tasks,
   * or stop one. Scheduling reuses the SAME manage/checkout builders to resolve
   * exactly what to repeat, then persists it for the cron sweep to fire.
   */
  private async *runRecurrence(
    intent: RecurrenceIntent,
    prompt: string,
    req: RunRequest,
    user: User | null,
    conversationId: string | null,
    provider: ReturnType<AIService['forRequest']>,
  ): AsyncGenerator<AgentEvent> {
    if (!user) {
      yield* this.runMessage('Sign in first and I can set up recurring tasks like "order my usual every Friday".', conversationId);
      return;
    }

    if (intent.kind === 'list') {
      const list = await this.recurrences.listMine(user.clerkId);
      yield* this.runMessage(describeRecurrences(list), conversationId);
      return;
    }

    if (intent.kind === 'cancel') {
      const active = (await this.recurrences.listMine(user.clerkId)).filter((r) => r.active);
      if (!active.length) {
        yield* this.runMessage("You don't have any recurring tasks set up right now.", conversationId);
        return;
      }
      const target = pickRecurrence(active, prompt);
      if (!target) {
        const names = active.map((r) => `“${r.label}” (${r.scheduleLabel})`).join(', ');
        yield* this.runMessage(`You have ${active.length} recurring tasks: ${names}. Which one should I stop?`, conversationId);
        return;
      }
      await this.recurrences.cancel(user.clerkId, target.id);
      yield* this.runMessage(`Done — I've stopped “${target.label}” (${target.scheduleLabel}). It won't run again.`, conversationId);
      return;
    }

    // schedule — resolve WHAT to repeat from the request (minus the schedule clause).
    const base = stripSchedule(prompt) || prompt;
    const drafts = await this.resolveSchedulableDrafts(base, req, provider);
    if (typeof drafts === 'string') {
      yield* this.runMessage(drafts, conversationId);
      return;
    }

    const recurrence = await this.recurrences.create(user.clerkId, {
      prompt: base,
      label: labelForDrafts(drafts),
      marketplace: drafts.length === 1 ? drafts[0].marketplace : null,
      drafts,
      cadence: intent.spec.cadence,
      weekday: intent.spec.weekday,
      hour: intent.spec.hour,
      minute: intent.spec.minute,
    });
    if (!recurrence) {
      yield* this.runMessage("I couldn't save that recurring task just now — please try again in a moment.", conversationId);
      return;
    }
    yield* this.emitScheduled(recurrence, conversationId);
  }

  /**
   * Resolve a concrete set of drafts to repeat, reusing the order/booking
   * builders. Returns the drafts, or a helpful message string when the request
   * isn't something we can schedule (no history, too vague, etc.).
   */
  private async resolveSchedulableDrafts(
    base: string,
    req: RunRequest,
    provider: ReturnType<AIService['forRequest']>,
  ): Promise<CheckoutDraft[] | string> {
    // If the request explicitly NAMES a place ("my usual from Dar Tagine"), schedule
    // THAT place — don't let the generic "usual" reorder pick the most-frequent vendor
    // (which would wrongly save Napoli when the user said Dar Tagine).
    if (/\b(napoli|sakura|smashed|dar\s*tagine|green\s*bowl)\b/i.test(base)) {
      const outcome = await buildCheckout(provider, this.tools, base, req.location, req.history);
      if (outcome?.kind === 'drafts') return outcome.drafts;
      if (outcome?.kind === 'message') return outcome.text;
    }
    const manage = await buildManage(this.tools, base, req.account, req.location);
    if (manage) {
      if (manage.kind === 'reorder') return manage.drafts;
      if (manage.kind === 'message') return manage.text;
      return 'I can schedule new orders, bookings, and rides — but not changes to existing ones. Tell me what to order or book and I\'ll set it to repeat.';
    }
    const outcome = await buildCheckout(provider, this.tools, base, req.location, req.history);
    if (!outcome) return 'Tell me exactly what to repeat — e.g. "order a pizza from Napoli in Rabat every Friday".';
    if (outcome.kind === 'drafts') return outcome.drafts;
    if (outcome.kind === 'message') return outcome.text;
    return 'I need the exact order to repeat. Try naming the place, e.g. "order my usual from Dar Tagine every Friday".';
  }

  /** Emits a "scheduled" card + a streamed confirmation for a new recurrence. */
  private async *emitScheduled(recurrence: RecurrenceView, conversationId: string | null): AsyncGenerator<AgentEvent> {
    yield { type: 'scheduled', recurrence };
    const answer = `Scheduled ✓ — “${recurrence.label}”, ${recurrence.scheduleLabel.toLowerCase()} (first run ${formatNext(recurrence.nextRunAt)}). I'll take care of it automatically — manage or cancel it anytime from your Dashboard.`;
    let streamed = '';
    for (const word of answer.split(' ')) {
      streamed += word + ' ';
      yield { type: 'token', text: word + ' ' };
      await sleep(18);
    }
    const messageId = await this.conversations.appendAssistantMessage(conversationId, streamed.trim(), [], []);
    yield { type: 'done', messageId, conversationId: conversationId ?? undefined };
  }

  /** Emits steps + a combined checkout event + answer for 1–2 direct actions. */
  private async *runCheckout(drafts: CheckoutDraft[], conversationId: string | null, trip?: TripPlan): AsyncGenerator<AgentEvent> {
    // One "find + assemble" step per draft, then a shared "prepare checkout" step.
    const tasks: AgentTask[] = [];
    for (const d of drafts) {
      tasks.push({ id: randomUUID(), title: draftTaskTitle(d), tool: draftTool(d), status: 'pending' });
    }
    tasks.push({ id: randomUUID(), title: 'Prepare your receipt', tool: 'notification', status: 'pending' });
    yield { type: 'plan', tasks };

    for (let i = 0; i < tasks.length; i++) {
      const d = drafts[i];
      const isLast = i === tasks.length - 1;
      const label = isLast ? 'Notification tool' : draftToolLabel(d);
      const detail = isLast
        ? `Total ${drafts.reduce((n, x) => n + x.total, 0)} MAD across ${drafts.length} action(s)`
        : draftStepDetail(d);
      const s = newStep(label, tasks[i].title, tasks[i].tool);
      yield { type: 'step', step: s };
      yield { type: 'step_update', id: tasks[i].id, status: 'running' };
      await sleep(450);
      yield { type: 'step_update', id: s.id, status: 'done', detail };
      yield { type: 'step_update', id: tasks[i].id, status: 'done' };
    }

    yield { type: 'checkout', drafts, trip };

    const answer = composeCheckoutAnswer(drafts, trip);
    let streamed = '';
    for (const word of answer.split(' ')) {
      streamed += word + ' ';
      yield { type: 'token', text: word + ' ' };
      await sleep(20);
    }

    const doneTasks: AgentTask[] = tasks.map((t) => ({ ...t, status: 'done' }));
    const messageId = await this.conversations.appendAssistantMessage(conversationId, streamed.trim(), [], doneTasks);
    yield { type: 'done', messageId, conversationId: conversationId ?? undefined };
  }

  /**
   * Emits a short clarifying question (with tappable options) instead of
   * guessing when an ambiguous follow-up can't be resolved confidently.
   */
  private async *runClarify(clarify: ClarifyRequest, conversationId: string | null): AsyncGenerator<AgentEvent> {
    yield { type: 'clarify', question: clarify.question, options: clarify.options };

    let streamed = '';
    for (const word of clarify.question.split(' ')) {
      streamed += word + ' ';
      yield { type: 'token', text: word + ' ' };
      await sleep(18);
    }

    const messageId = await this.conversations.appendAssistantMessage(conversationId, streamed.trim(), [], []);
    yield { type: 'done', messageId, conversationId: conversationId ?? undefined };
  }

  /** Emits a confirm-ready change to an existing order/booking (cancel/modify). */
  private async *runManage(action: ManageAction, conversationId: string | null): AsyncGenerator<AgentEvent> {
    const verb = action.kind === 'cancel' ? 'Cancel' : 'Update';
    const noun = action.marketplace === 'eats' ? 'order' : action.marketplace === 'rides' ? 'ride' : 'booking';
    const tool: ToolId = action.marketplace === 'eats' ? 'restaurant' : action.marketplace === 'rides' ? 'maps' : 'travel';
    const marketLabel =
      action.marketplace === 'eats' ? 'OMNIA Eats tool' : action.marketplace === 'rides' ? 'OMNIA Rides tool' : 'OMNIA Stays tool';
    const tasks: AgentTask[] = [
      { id: randomUUID(), title: `Find your ${noun}`, tool, status: 'pending' },
      { id: randomUUID(), title: `${verb} · ${action.title}`, tool: 'notification', status: 'pending' },
    ];
    yield { type: 'plan', tasks };

    for (let i = 0; i < tasks.length; i++) {
      const label = i === 0 ? marketLabel : 'Notification tool';
      const s = newStep(label, tasks[i].title, tasks[i].tool);
      yield { type: 'step', step: s };
      yield { type: 'step_update', id: tasks[i].id, status: 'running' };
      await sleep(420);
      const detail = i === 0 ? `Matched ${action.title}` : `Ready to ${verb.toLowerCase()}`;
      yield { type: 'step_update', id: s.id, status: 'done', detail };
      yield { type: 'step_update', id: tasks[i].id, status: 'done' };
    }

    yield { type: 'manage', action };

    const answer = composeManageAnswer(action);
    let streamed = '';
    for (const word of answer.split(' ')) {
      streamed += word + ' ';
      yield { type: 'token', text: word + ' ' };
      await sleep(18);
    }

    const doneTasks: AgentTask[] = tasks.map((t) => ({ ...t, status: 'done' }));
    const messageId = await this.conversations.appendAssistantMessage(conversationId, streamed.trim(), [], doneTasks);
    yield { type: 'done', messageId, conversationId: conversationId ?? undefined };
  }

  /** Emits a visual menu card for a vendor + a short streamed intro. */
  private async *runMenu(menu: MenuView, conversationId: string | null): AsyncGenerator<AgentEvent> {
    yield { type: 'menu', menu };
    const base = menu.vendorName.split('·')[0].trim();
    const answer = `Here's ${menu.vendorName}'s menu — tap any dish to add it, or just tell me what you'd like (e.g. "order a ${menu.items[0]?.name ?? 'dish'} from ${base}").`;
    let streamed = '';
    for (const word of answer.split(' ')) {
      streamed += word + ' ';
      yield { type: 'token', text: word + ' ' };
      await sleep(16);
    }
    const messageId = await this.conversations.appendAssistantMessage(conversationId, streamed.trim(), [], []);
    yield { type: 'done', messageId, conversationId: conversationId ?? undefined };
  }

  /** Streams a plain assistant message (e.g. "you have no orders to cancel"). */
  private async *runMessage(text: string, conversationId: string | null): AsyncGenerator<AgentEvent> {
    let streamed = '';
    for (const word of text.split(' ')) {
      streamed += word + ' ';
      yield { type: 'token', text: word + ' ' };
      await sleep(16);
    }
    const messageId = await this.conversations.appendAssistantMessage(conversationId, streamed.trim(), [], []);
    yield { type: 'done', messageId, conversationId: conversationId ?? undefined };
  }
}

function composeCheckoutAnswer(drafts: CheckoutDraft[], trip?: TripPlan): string {
  const parts = drafts.map((d) => {
    if (d.marketplace === 'eats') {
      const items = (d.items ?? []).map((i) => `${i.qty}× ${i.name}`).join(', ');
      return `from ${d.title}: ${items} (${d.total} ${d.currency})`;
    }
    if (d.marketplace === 'rides') {
      return `${d.title}: ${d.pickup} → ${d.dropoff} (${d.total} ${d.currency})`;
    }
    return `${d.title} for ${plural(d.nights ?? 1, 'night')}, ${plural(d.guests ?? 1, 'guest')} (${d.total} ${d.currency})`;
  });
  const grand = drafts.reduce((n, d) => n + d.total, 0);
  const notes = drafts.map((d) => d.note).filter((n): n is string => Boolean(n));
  const noteSuffix = notes.length ? ` ${notes.join(' ')}` : '';
  if (drafts.length === 1) {
    const noun = drafts[0].marketplace === 'rides' ? 'ride' : drafts[0].marketplace === 'stays' ? 'booking' : 'order';
    const upsell = drafts[0].supplements?.length ? ' Want a drink or a side with that? Pick one below, or skip.' : '';
    return `Done — here's your ${noun}: ${parts[0]}.${noteSuffix}${upsell} Review the receipt and tap Buy now to confirm.`;
  }
  const cur = drafts[0].currency;
  let budgetLine = '';
  if (trip?.budget) {
    const b = trip.budget;
    budgetLine =
      ` Budget — stay ${b.stay}, ride ${b.ride}, food ${b.food} = ${b.total} ${cur}` +
      (b.budget != null
        ? b.overBudget
          ? ` (⚠️ ${b.total - b.budget} ${cur} over your ${b.budget} ${cur} budget).`
          : ` (${b.remaining} ${cur} left of your ${b.budget} ${cur} budget).`
        : '.');
  }
  // Only call it a "trip" with an itinerary when we actually planned one. A plain
  // multi-action receipt (e.g. a stay + a food order) gets neutral wording.
  if (trip) {
    return `Done — I've planned your whole trip: ${parts.join(' · ')}. Grand total ${grand} ${cur}.${budgetLine}${noteSuffix} See the day-by-day itinerary below, then tap Buy now to confirm it all in one go.`;
  }
  return `Done — here's what I put together: ${parts.join(' · ')}. Grand total ${grand} ${cur}.${noteSuffix} Review the receipt and tap Buy now to confirm it all in one go.`;
}

function draftTool(d: CheckoutDraft): ToolId {
  return d.marketplace === 'eats' ? 'restaurant' : d.marketplace === 'rides' ? 'maps' : 'travel';
}
function draftTaskTitle(d: CheckoutDraft): string {
  if (d.marketplace === 'eats') return `Build order · ${d.title}`;
  if (d.marketplace === 'rides') return `Reserve ride · ${d.title}`;
  return `Reserve · ${d.title}`;
}
function draftToolLabel(d: CheckoutDraft): string {
  if (d.marketplace === 'eats') return 'OMNIA Eats tool';
  if (d.marketplace === 'rides') return 'OMNIA Rides tool';
  return 'OMNIA Stays tool';
}
function draftStepDetail(d: CheckoutDraft): string {
  if (d.marketplace === 'eats') return `${d.items?.reduce((n, x) => n + x.qty, 0) ?? 0} item(s) · ${d.total} ${d.currency}`;
  if (d.marketplace === 'rides') return `${d.distanceKm} km · ${d.total} ${d.currency}`;
  return `${d.nights} night(s) · ${d.total} ${d.currency}`;
}

function composeManageAnswer(a: ManageAction): string {
  if (a.kind === 'cancel') {
    const what =
      a.marketplace === 'eats' ? `your order from ${a.title}` : a.marketplace === 'rides' ? `your ride (${a.title})` : `your booking at ${a.title}`;
    const cta = a.marketplace === 'eats' ? 'Cancel order' : a.marketplace === 'rides' ? 'Cancel ride' : 'Cancel booking';
    return `Just to confirm — you want to cancel ${what}${a.subtitle ? ` (${a.subtitle})` : ''}? Tap ${cta} below and it's done. No charge.`;
  }
  // modify — ride pickup/dropoff
  if (a.marketplace === 'rides') {
    const changes: string[] = [];
    if (a.pickup != null && a.pickup !== a.prevPickup) changes.push(`pickup → ${a.pickup}`);
    if (a.dropoff != null && a.dropoff !== a.prevDropoff) changes.push(`dropoff → ${a.dropoff}`);
    const delta = changes.length ? changes.join(', ') : 'your ride';
    return `Here's the update to your ride: ${delta}. Tap Confirm change to apply it.`;
  }
  // modify — stay nights/guests
  const changes: string[] = [];
  if (a.nights != null && a.nights !== a.prevNights) changes.push(`${a.prevNights ?? '?'} → ${plural(a.nights, 'night')}`);
  if (a.guests != null && a.guests !== a.prevGuests) changes.push(`${a.prevGuests ?? '?'} → ${plural(a.guests, 'guest')}`);
  const delta = changes.length ? changes.join(', ') : 'your booking';
  return `Here's the update to ${a.title}: ${delta}. New total ${a.newTotal} ${a.currency}. Tap Confirm change to apply it.`;
}

/** A readable summary of the user's recurring tasks for a chat reply. */
function describeRecurrences(list: RecurrenceView[]): string {
  const active = list.filter((r) => r.active);
  if (!active.length) {
    return 'You don\'t have any recurring tasks set up yet. Try "order my usual every Friday" or "book my usual ride every morning" to create one.';
  }
  const lines = active.map((r) => `• ${r.label} — ${r.scheduleLabel} (next ${formatNext(r.nextRunAt)})`);
  return `Here are your recurring tasks:\n${lines.join('\n')}\nSay "stop <name>" to cancel one, or manage them in your Dashboard.`;
}

/**
 * Pick which recurrence a "stop …" request refers to:
 *   1) by keyword/name match against the label + original prompt,
 *   2) else by marketplace TYPE ("stop my recurring ride/order/stay") when exactly
 *      one active task is of that type,
 *   3) else the lone task if there's only one.
 */
function pickRecurrence(active: RecurrenceView[], prompt: string): RecurrenceView | undefined {
  const lp = prompt.toLowerCase();

  // If the user named a type ("stop my recurring RIDE/ORDER/STAY"), prefer tasks
  // of that marketplace — this is the clearest signal, so it wins first.
  const mk = marketplaceFromText(lp);
  const pool = mk ? active.filter((r) => r.marketplace === mk) : active;
  if (mk && pool.length === 1) return pool[0];

  // Keyword/name match (within the typed pool when present, else everything).
  const candidates = pool.length ? pool : active;
  let best: RecurrenceView | undefined;
  let score = 0;
  for (const r of candidates) {
    let s = 0;
    for (const tok of `${r.label} ${r.prompt}`.toLowerCase().split(/\s+/)) {
      if (tok.length >= 4 && lp.includes(tok)) s += 1;
    }
    if (s > score) {
      score = s;
      best = r;
    }
  }
  if (score > 0) return best;

  // A type was named but several tasks match it → ambiguous, ask which one.
  if (mk && pool.length > 1) return undefined;
  return active.length === 1 ? active[0] : undefined;
}

/** Infer the marketplace a "stop my recurring X" request points at, by type words. */
function marketplaceFromText(lp: string): 'eats' | 'stays' | 'rides' | null {
  if (/\b(ride|rides|taxi|cab|car|driver|chauffeur)\b/.test(lp)) return 'rides';
  if (/\b(food|meal|order|orders|eat|dish|pizza|burger|tagine|tajine)\b/.test(lp)) return 'eats';
  if (/\b(stay|stays|booking|hotel|riad|apartment|villa|studio|room|nights?)\b/.test(lp)) return 'stays';
  return null;
}

function formatNext(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function newStep(label: string, detail: string, tool: AgentStep['tool']): AgentStep {
  return { id: randomUUID(), label, detail, tool, status: 'running', startedAt: Date.now() };
}

/** Merge tool recommendations and ensure exactly one "best" is highlighted. */
function aggregate(results: ToolResult[]): Recommendation[] {
  const all = results.flatMap((r) => r.recommendations);
  if (!all.length) return [];
  let bestSeen = false;
  return all.map((r) => {
    if (r.best && !bestSeen) {
      bestSeen = true;
      return r;
    }
    return { ...r, best: false };
  });
}
