import type { ChatMessage, ToolId, ToolResult } from './agent.types';

export interface PlannedTask {
  title: string;
  tool: ToolId;
}

export interface AgentPlan {
  tasks: PlannedTask[];
}

/**
 * The provider contract used by the agent orchestrator. Implementations:
 *   - ClaudeProvider  (Anthropic SDK)
 *   - OpenAIProvider  (OpenAI SDK)
 *   - MockProvider    (deterministic, keyless)
 *
 * The orchestrator (AgentService) is provider-agnostic: it calls plan() then
 * streamAnswer(), wiring tool execution in between.
 */
export interface AIProvider {
  readonly id: string;

  /** Decompose a request into ordered, tool-scoped tasks. */
  plan(prompt: string, history: ChatMessage[]): Promise<AgentPlan>;

  /** Stream the final natural-language answer given tool results. */
  streamAnswer(
    prompt: string,
    history: ChatMessage[],
    toolResults: ToolResult[],
  ): AsyncGenerator<string, void, unknown>;

  /** One-shot completion used for structured extraction (e.g. building an order). */
  complete(system: string, user: string): Promise<string>;
}

export const AI_PROVIDER = Symbol('AI_PROVIDER');
