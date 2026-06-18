import Anthropic from '@anthropic-ai/sdk';
import type { AIProvider, AgentPlan } from '../ai-provider.interface';
import type { ChatMessage, ToolId, ToolResult } from '../agent.types';
import { coercePlan, planningInstruction, answerInstruction, toAnthropicHistory } from './prompt-utils';

const VALID_TOOLS: ToolId[] = ['travel', 'maps', 'restaurant', 'shopping', 'calendar', 'notification'];

/** Real planner + answer generation via the Anthropic Claude API. */
export class ClaudeProvider implements AIProvider {
  readonly id = 'claude';
  private readonly client: Anthropic;

  constructor(
    apiKey: string,
    private readonly model: string,
  ) {
    this.client = new Anthropic({ apiKey });
  }

  async plan(prompt: string, history: ChatMessage[]): Promise<AgentPlan> {
    const res = await this.client.messages.create({
      model: this.model,
      max_tokens: 600,
      system: planningInstruction(VALID_TOOLS),
      messages: [
        ...toAnthropicHistory(history),
        { role: 'user', content: `Request: "${prompt}"\nReturn the plan as JSON now.` },
      ],
    });
    const text = res.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('');
    return coercePlan(text, VALID_TOOLS);
  }

  async *streamAnswer(
    prompt: string,
    history: ChatMessage[],
    toolResults: ToolResult[],
  ): AsyncGenerator<string> {
    const stream = await this.client.messages.create({
      model: this.model,
      max_tokens: 700,
      system: answerInstruction(),
      messages: [
        ...toAnthropicHistory(history),
        {
          role: 'user',
          content: `User request: "${prompt}"\n\nTool results (JSON):\n${JSON.stringify(toolResults)}\n\nWrite the concise, helpful reply now.`,
        },
      ],
      stream: true,
    });

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        yield event.delta.text;
      }
    }
  }

  async complete(system: string, user: string): Promise<string> {
    const res = await this.client.messages.create({
      model: this.model,
      max_tokens: 800,
      system,
      messages: [{ role: 'user', content: user }],
    });
    return res.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('');
  }
}
