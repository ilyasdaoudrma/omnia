import type { AIProvider, AgentPlan } from '../ai-provider.interface';
import type { ChatMessage, ToolId, ToolResult } from '../agent.types';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Heuristic intent → plan mapping, mirroring the frontend mock scenarios. */
function planFor(prompt: string): AgentPlan {
  const p = prompt.toLowerCase();
  if (/(rabat|apartment|beachfront|stay|hotel|night|airbnb|accommodation)/.test(p)) {
    return {
      tasks: [
        { title: 'Parse trip details & budget', tool: 'travel' },
        { title: 'Locate beachfront areas', tool: 'maps' },
        { title: 'Search stays for the dates', tool: 'travel' },
        { title: 'Filter under budget', tool: 'travel' },
        { title: 'Rank by value & distance', tool: 'maps' },
      ],
    };
  }
  if (/(burger|hungry|food|eat|delivery|restaurant|dinner|lunch)/.test(p)) {
    return {
      tasks: [
        { title: 'Detect location & cuisine intent', tool: 'maps' },
        { title: 'Search spots with delivery', tool: 'restaurant' },
        { title: 'Filter by budget', tool: 'restaurant' },
        { title: 'Rank by rating & ETA', tool: 'restaurant' },
      ],
    };
  }
  if (/(ride|taxi|car|airport|casablanca|drive|transport|pickup)/.test(p)) {
    return {
      tasks: [
        { title: 'Extract route & time window', tool: 'maps' },
        { title: 'Estimate distance & duration', tool: 'maps' },
        { title: 'Compare ride options & fares', tool: 'travel' },
        { title: 'Schedule pickup reminder', tool: 'calendar' },
      ],
    };
  }
  if (/(beach|sunscreen|sunglasses|water|snack|order|buy|shop|product)/.test(p)) {
    return {
      tasks: [
        { title: 'Build shopping list', tool: 'shopping' },
        { title: 'Find items in stock', tool: 'shopping' },
        { title: 'Compare prices & bundle', tool: 'shopping' },
        { title: 'Schedule delivery', tool: 'notification' },
      ],
    };
  }
  return {
    tasks: [
      { title: 'Understand intent', tool: 'maps' },
      { title: 'Select relevant tools', tool: 'travel' },
      { title: 'Search & compare options', tool: 'restaurant' },
      { title: 'Draft recommendation', tool: 'notification' },
    ],
  };
}

export class MockProvider implements AIProvider {
  readonly id = 'mock';

  async plan(prompt: string): Promise<AgentPlan> {
    await sleep(400);
    return planFor(prompt);
  }

  async *streamAnswer(
    _prompt: string,
    _history: ChatMessage[],
    toolResults: ToolResult[],
  ): AsyncGenerator<string> {
    const best = toolResults.flatMap((r) => r.recommendations).find((r) => r.best);
    const summary = toolResults.find((r) => r.recommendations.length)?.summary ?? '';
    const answer = best
      ? `Here's what I found. ${summary} My top pick is ${best.title}${
          best.price ? ` at ${best.price} MAD` : ''
        }${best.rating ? `, rated ${best.rating}★` : ''}. Want me to go ahead and book it?`
      : `I've broken your request into tasks, selected the right tools, and gathered options. Tell me which direction you prefer and I'll take it the rest of the way.`;

    for (const word of answer.split(' ')) {
      yield word + ' ';
      await sleep(24);
    }
  }

  async complete(): Promise<string> {
    // The mock provider can't do structured extraction.
    return '{"action":"none"}';
  }
}

export const TOOL_ORDER: ToolId[] = ['travel', 'maps', 'restaurant', 'shopping', 'calendar', 'notification'];
