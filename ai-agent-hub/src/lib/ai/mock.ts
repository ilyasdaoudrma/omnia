import type { AIProvider, AgentEvent, RunInput, AgentStep } from './types';
import { pickScenario, toTasks } from './scenarios';
import { uid, sleep } from '@/lib/utils';

/**
 * MockProvider replays a believable agent run — Planner → tasks → tool
 * execution → streamed answer → recommendations — entirely client-side.
 * It implements the same AIProvider contract as the real Claude/OpenAI
 * adapters, so swapping in a backend later changes nothing in the UI.
 */
export class MockProvider implements AIProvider {
  readonly id = 'mock';

  async *run({ prompt, signal }: RunInput): AsyncGenerator<AgentEvent> {
    const scenario = pickScenario(prompt);
    const aborted = () => signal?.aborted;

    // 1) Planner agent decomposes the request.
    await sleep(500);
    if (aborted()) return;
    const tasks = toTasks(scenario.plan);
    yield { type: 'plan', tasks };

    // 2) Execute each step, surfacing live status to the Activity Center.
    for (let i = 0; i < scenario.steps.length; i++) {
      if (aborted()) return;
      const s = scenario.steps[i];
      const step: AgentStep = {
        id: uid('step'),
        label: s.label,
        detail: s.detail,
        tool: s.tool,
        status: 'running',
        startedAt: Date.now(),
      };
      yield { type: 'step', step };

      // Reflect progress onto the matching task.
      const task = tasks[i];
      if (task) yield { type: 'step_update', id: task.id, status: 'running' };

      await sleep(s.ms);
      if (aborted()) return;

      yield { type: 'step_update', id: step.id, status: 'done', detail: s.detail };
      if (task) yield { type: 'step_update', id: task.id, status: 'done' };
    }

    // 3) Stream the assistant's natural-language answer token by token.
    if (aborted()) return;
    const messageId = uid('msg');
    const words = scenario.answer.split(' ');
    for (const w of words) {
      if (aborted()) return;
      yield { type: 'token', text: w + ' ' };
      await sleep(26);
    }

    // 4) Surface structured recommendations.
    await sleep(250);
    if (aborted()) return;
    yield { type: 'recommendations', items: scenario.recommendations };

    yield { type: 'done', messageId };
  }
}
