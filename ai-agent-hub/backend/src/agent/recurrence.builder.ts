import type { CheckoutDraft } from '../ai/agent.types';
import type { Cadence } from '../recurrences/recurrences.service';

/** A scheduling request the user made ("…every Friday at 7pm"). */
export interface ScheduleSpec {
  cadence: Cadence;
  weekday: number | null; // 0=Sun..6=Sat
  hour: number;
  minute: number;
}

export type RecurrenceIntent =
  | { kind: 'schedule'; spec: ScheduleSpec }
  | { kind: 'list' }
  | { kind: 'cancel' };

// A recurring-schedule marker: "every Friday", "each morning", "daily", "weekly".
const RECURRING_RE =
  /\b(every|each)\s+(day|morning|evening|night|afternoon|noon|week|weekday|sunday|monday|tuesday|wednesday|thursday|friday|saturday|sun|mon|tue|tues|wed|thu|thur|thurs|fri|sat)\b|\b(daily|weekly|recurring|every\s*day)\b/i;

const STOP = /\b(stop|cancel|end|remove|delete|turn off|disable|unsubscribe)\b/i;
const LIST =
  /\b(what|which|show|list|see|view)\b[\s\S]{0,40}\b(recurring|scheduled|schedule|repeating|standing|automatic)\b|\bmy\s+(recurring|scheduled|repeating|standing)\b/i;

const WEEKDAYS: { re: RegExp; day: number }[] = [
  { re: /\bsun(day)?\b/i, day: 0 },
  { re: /\bmon(day)?\b/i, day: 1 },
  { re: /\btue(s|sday)?\b/i, day: 2 },
  { re: /\bwed(nesday)?\b/i, day: 3 },
  { re: /\bthu(r|rs|rsday)?\b/i, day: 4 },
  { re: /\bfri(day)?\b/i, day: 5 },
  { re: /\bsat(urday)?\b/i, day: 6 },
];

/**
 * Classify a message as a recurring-task intent, or null if it isn't one.
 * Order matters: a "stop … recurring" or "what are my recurring" is a manage
 * intent even though it contains a schedule word.
 */
export function detectRecurrence(prompt: string): RecurrenceIntent | null {
  const hasSchedule = RECURRING_RE.test(prompt);
  const mentionsRecurring = hasSchedule || /\b(recurring|scheduled|repeating|standing)\b/i.test(prompt);

  // Cancel is checked BEFORE list: "stop my recurring ride" contains "my recurring"
  // (which the list pattern also matches), but the STOP verb makes it a cancel.
  if (STOP.test(prompt) && mentionsRecurring) {
    return { kind: 'cancel' };
  }

  // "what are my recurring tasks", "list my scheduled orders", "show my recurring"
  if (LIST.test(prompt) && mentionsRecurring) {
    return { kind: 'list' };
  }

  if (hasSchedule) return { kind: 'schedule', spec: parseSchedule(prompt) };
  return null;
}

/** Parse cadence + weekday + time out of a scheduling phrase. */
export function parseSchedule(prompt: string): ScheduleSpec {
  const named = WEEKDAYS.find((w) => w.re.test(prompt));
  const weekly = Boolean(named) || /\b(week|weekly|weekday)\b/i.test(prompt);
  const cadence: Cadence = weekly ? 'weekly' : 'daily';
  const { hour, minute } = parseTime(prompt);
  return { cadence, weekday: named ? named.day : null, hour, minute };
}

function parseTime(prompt: string): { hour: number; minute: number } {
  const lp = prompt.toLowerCase();
  // "at 7pm", "at 19:00", "at 7:30 am", or a bare "7pm"
  const m = lp.match(/\bat\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/) || lp.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/);
  if (m) {
    let h = parseInt(m[1], 10);
    const min = m[2] ? parseInt(m[2], 10) : 0;
    const ap = m[3];
    if (ap === 'pm' && h < 12) h += 12;
    if (ap === 'am' && h === 12) h = 0;
    if (h >= 0 && h <= 23 && min >= 0 && min < 60) return { hour: h, minute: min };
  }
  if (/\bmorning\b/.test(lp)) return { hour: 8, minute: 0 };
  if (/\b(noon|midday)\b/.test(lp)) return { hour: 12, minute: 0 };
  if (/\bafternoon\b/.test(lp)) return { hour: 15, minute: 0 };
  if (/\bevening\b/.test(lp)) return { hour: 19, minute: 0 };
  if (/\bnight\b/.test(lp)) return { hour: 21, minute: 0 };
  return { hour: 9, minute: 0 }; // sensible default
}

/**
 * Remove the scheduling clause so the underlying order/booking builders see a
 * clean request ("order my usual every Friday at 7pm" → "order my usual").
 */
export function stripSchedule(prompt: string): string {
  return prompt
    .replace(/\b(every|each)\s+(day|morning|evening|night|afternoon|noon|week|weekday|sunday|monday|tuesday|wednesday|thursday|friday|saturday|sun|mon|tue|tues|wed|thu|thur|thurs|fri|sat)\b/gi, ' ')
    .replace(/\b(daily|weekly|recurring)\b/gi, ' ')
    .replace(/\bat\s+\d{1,2}(?::\d{2})?\s*(am|pm)?\b/gi, ' ')
    .replace(/\b(in the\s+)?(morning|afternoon|evening|night|noon|midday)\b/gi, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/** A human summary of WHAT a set of drafts does, for the recurrence label. */
export function labelForDrafts(drafts: CheckoutDraft[]): string {
  if (!drafts.length) return 'Recurring task';
  if (drafts.length > 1) return `Trip — ${drafts.map((d) => d.title).join(', ')}`;
  const d = drafts[0];
  if (d.marketplace === 'eats') return `Order from ${d.title}`;
  if (d.marketplace === 'stays') return `Stay at ${d.title}`;
  return d.pickup && d.dropoff ? `${d.title}: ${d.pickup} → ${d.dropoff}` : `Ride · ${d.title}`;
}
