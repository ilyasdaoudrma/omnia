import OpenAI from 'openai';
import type { AIProvider, AgentPlan } from '../ai-provider.interface';
import type { ChatMessage, ToolId, ToolResult } from '../agent.types';
import { coercePlan, planningInstruction, answerInstruction, toOpenAIHistory } from './prompt-utils';

const VALID_TOOLS: ToolId[] = ['travel', 'maps', 'restaurant', 'shopping', 'calendar', 'notification'];

/**
 * Real planner + answer generation via the OpenAI Chat Completions API.
 * Also powers any OpenAI-compatible endpoint (e.g. Groq for Llama) by passing
 * a custom baseURL — same wire format, different host.
 */
export class OpenAIProvider implements AIProvider {
  readonly id: string;
  private readonly client: OpenAI;

  constructor(
    apiKey: string,
    private readonly model: string,
    options: { baseURL?: string; id?: string } = {},
  ) {
    this.id = options.id ?? 'openai';
    this.client = new OpenAI({ apiKey, baseURL: options.baseURL });
  }

  async plan(prompt: string, history: ChatMessage[]): Promise<AgentPlan> {
    const res = await this.client.chat.completions.create({
      model: this.model,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: planningInstruction(VALID_TOOLS) },
        ...toOpenAIHistory(history),
        { role: 'user', content: `Request: "${prompt}". Return the plan as JSON now.` },
      ],
    });
    return coercePlan(res.choices[0]?.message?.content ?? '', VALID_TOOLS);
  }

  async *streamAnswer(
    prompt: string,
    history: ChatMessage[],
    toolResults: ToolResult[],
  ): AsyncGenerator<string> {
    const stream = await this.client.chat.completions.create({
      model: this.model,
      stream: true,
      messages: [
        { role: 'system', content: answerInstruction() },
        ...toOpenAIHistory(history),
        {
          role: 'user',
          content: `User request: "${prompt}"\n\nTool results (JSON):\n${JSON.stringify(toolResults)}\n\nWrite the concise, helpful reply now.`,
        },
      ],
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) yield delta;
    }
  }

  async complete(system: string, user: string): Promise<string> {
    const res = await this.client.chat.completions.create({
      model: this.model,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    });
    return res.choices[0]?.message?.content ?? '';
  }
}
