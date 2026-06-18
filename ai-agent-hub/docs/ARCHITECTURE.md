# AI Agent Hub — Architecture

This document covers the **agent system**, the **frontend ⇄ backend contract**, and the
**planned backend** (NestJS + Prisma + Postgres) so the "real integrations" phase drops
in without touching the UI.

---

## 1. The agent system

```
User request
   ↓
Planner agent          → decomposes into ordered, tool-scoped tasks
   ↓
Tool selection         → picks the right tool per task
   ↓
Execution agent        → runs tools, gathers live options
   ↓
Recommendation engine  → ranks options by price, rating, fit
   ↓
User approval          → nothing is booked/bought without confirmation
   ↓
Action execution
```

Every stage emits an **`AgentEvent`** that the UI renders live in the Chat view and the
**Agent Activity Center**. The contract lives in `src/lib/ai/types.ts`:

```ts
type AgentEvent =
  | { type: 'plan';          tasks: AgentTask[] }
  | { type: 'step';          step: AgentStep }
  | { type: 'step_update';   id: string; status: StepStatus; detail?: string }
  | { type: 'token';         text: string }              // streamed answer text
  | { type: 'recommendations'; items: Recommendation[] }
  | { type: 'done';          messageId: string }
  | { type: 'error';         message: string };
```

### Provider abstraction
```ts
interface AIProvider {
  readonly id: string;
  run(input: RunInput): AsyncGenerator<AgentEvent>;
}
```
- `MockProvider` (`mock.ts`) — replays scenarios entirely client-side. Default.
- `BackendProvider` (`backend.ts`) — streams the same events from your backend via SSE.

`createAIProvider()` picks the implementation from `VITE_AI_PROVIDER`. **The UI consumes
only the `AgentEvent` stream, so mock and production are fully interchangeable.**

### Tool registry (`tools.ts`)
`travel · maps · restaurant · shopping · calendar · notification` — each independently
expandable. On the backend these map to real integrations; on the frontend they describe
capabilities and drive iconography/labels.

---

## 2. Backend contract — `POST /agent/run`

The frontend `BackendProvider` issues:

```http
POST {VITE_API_BASE_URL}/agent/run
Content-Type: application/json
Accept: text/event-stream

{ "prompt": "...", "history": [ChatMessage], "provider": "claude" | "openai" }
```

The backend responds with **`text/event-stream`**, one JSON `AgentEvent` per SSE frame:

```
data: {"type":"plan","tasks":[...]}

data: {"type":"step","step":{...}}

data: {"type":"step_update","id":"step_x","status":"done"}

data: {"type":"token","text":"I found "}

data: {"type":"recommendations","items":[...]}

data: {"type":"done","messageId":"msg_x"}

data: [DONE]
```

That's the entire surface. Implement this endpoint and set `VITE_AI_PROVIDER=claude`
(or `openai`) — the chat and Activity Center light up with real model output.

> **Security:** secret model keys (`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`) live **only**
> on the backend. Never expose them through a `VITE_` variable.

---

## 3. Backend (implemented in `backend/`)

```
backend/                      NestJS + TypeScript
├── src/
│   ├── ai/                   AIProvider abstraction (Claude / OpenAI adapters)
│   ├── agent/                Planner, Executor, Recommendation orchestration
│   │   └── agent.controller  POST /agent/run  → SSE stream of AgentEvent
│   ├── tools/                travel | maps | restaurant | shopping | calendar | notification
│   ├── auth/                 Clerk JWT verification guard
│   ├── conversations/        CRUD + message persistence
│   ├── bookings/             Action execution + approvals
│   └── prisma/               PrismaService
└── prisma/schema.prisma
```

### Database schema (Prisma / PostgreSQL)
Models from the product spec:

| Model | Purpose |
| --- | --- |
| `User` | Clerk-linked identity & profile |
| `Conversation` | A chat thread |
| `Message` | Role-tagged messages within a conversation |
| `Task` | Decomposed planner tasks (tool + status) |
| `Itinerary` / `ItineraryItem` | Generated visual plans |
| `AgentAction` | Each executed/approved action + audit trail |
| `ConnectedAccount` | OAuth-scoped service links (revocable) |
| `Booking` | Confirmed travel/order records |
| `Notification` | Alerts & status updates |

These map 1:1 to the frontend types already defined in `src/lib/ai/types.ts` and
`src/data/*`, so the API can serialize straight into the existing UI models.

### AI layer abstraction (backend mirror of the frontend)
```
AIProvider
├── ClaudeProvider   (Anthropic SDK — claude-opus / sonnet)
├── OpenAIProvider   (OpenAI SDK)
└── <future>         drop-in, no controller changes
```

---

## 4. Why this shape

- **One event contract** → mock and prod share the exact UI. No throwaway demo code.
- **Provider-agnostic AI** → swap models/vendors without touching product surfaces.
- **Tool registry** → new capabilities are additive, not invasive.
- **Approval-gated actions** → the agent recommends; the user authorizes execution.
