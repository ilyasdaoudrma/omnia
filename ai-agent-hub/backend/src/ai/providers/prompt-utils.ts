import type { AgentPlan, PlannedTask } from '../ai-provider.interface';
import type { ChatMessage, ToolId } from '../agent.types';

export function planningInstruction(tools: ToolId[]): string {
  return [
    'You are the Planner in an agentic assistant that acts across travel, food, rides, and shopping.',
    'Decompose the user request into 3–6 ordered, concrete tasks.',
    `Each task must use exactly one tool from: ${tools.join(', ')}.`,
    'Respond with ONLY valid JSON, no prose, in this exact shape:',
    '{"tasks":[{"title":"short imperative task","tool":"travel"}]}',
  ].join(' ');
}

export function answerInstruction(): string {
  return [
    'You are OMNIA, a concise, friendly personal concierge for Morocco.',
    'Your scope is: finding & booking stays, ordering food, booking rides, and planning trips across six Moroccan cities (Rabat, Casablanca, Marrakech, Tanger, Oujda, Agadir).',
    'IMPORTANT: if the tool results below contain relevant places/options, ALWAYS help the user with them — never refuse. Anything about food, restaurants, stays, hotels, rides, cars, or trips is in scope, including follow-ups like "from another restaurant" or "a cheaper one".',
    "ONLY refuse when the request is clearly unrelated to travel/food/rides (e.g. general knowledge, coding, math, weather, news, other countries) AND there are no relevant tool results. In that case reply in ONE sentence: \"I'm the OMNIA agent — I can only help you find stays, order food, book rides, and plan trips across Morocco.\" then suggest one example.",
    'Recommend the best option(s) using ONLY the provided tool results (real places near the user).',
    'Refer to them by their real names and distances. Never invent places, prices, ratings, or availability that are not in the tool results.',
    'All prices are in Moroccan dirham — always write amounts as "MAD" (e.g. "120 MAD"), never "$", "USD", or "dollars".',
    'You can surface and shortlist options, but you cannot complete bookings/orders on third-party apps yet — if asked to book, say you can shortlist and hand off, and offer a maps/contact next step.',
    'If the tool results are empty because location is missing, briefly ask the user to enable location.',
    'Keep it to 2–4 sentences, warm and premium in tone.',
  ].join(' ');
}

/** Robustly extract a plan from a model's text output. */
export function coercePlan(text: string, validTools: ToolId[]): AgentPlan {
  const json = extractJson(text);
  if (json) {
    try {
      const parsed = JSON.parse(json) as { tasks?: Array<{ title?: string; tool?: string }> };
      const tasks: PlannedTask[] = (parsed.tasks ?? [])
        .filter((t) => t && typeof t.title === 'string' && validTools.includes(t.tool as ToolId))
        .map((t) => ({ title: t.title as string, tool: t.tool as ToolId }))
        .slice(0, 6);
      if (tasks.length) return { tasks };
    } catch {
      // fall through to default
    }
  }
  return defaultPlan();
}

function extractJson(text: string): string | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start === -1 || end === -1 || end < start) return null;
  return candidate.slice(start, end + 1);
}

function defaultPlan(): AgentPlan {
  return {
    tasks: [
      { title: 'Understand intent', tool: 'maps' },
      { title: 'Select relevant tools', tool: 'travel' },
      { title: 'Search & compare options', tool: 'restaurant' },
      { title: 'Draft recommendation', tool: 'notification' },
    ],
  };
}

/** Convert our neutral history to Anthropic message turns (drops system/empties). */
export function toAnthropicHistory(history: ChatMessage[]) {
  return history
    .filter((m) => (m.role === 'user' || m.role === 'assistant') && m.content.trim().length > 0)
    .slice(-8)
    .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));
}

/** Convert our neutral history to OpenAI chat messages. */
export function toOpenAIHistory(history: ChatMessage[]) {
  // Keep a generous window so the agent remembers the whole conversation, not just
  // the last couple of turns (16 messages ≈ 8 exchanges).
  return history
    .filter((m) => (m.role === 'user' || m.role === 'assistant') && m.content.trim().length > 0)
    .slice(-16)
    .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));
}
