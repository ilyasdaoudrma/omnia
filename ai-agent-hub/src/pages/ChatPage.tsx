import { PageTransition } from '@/components/fx/PageTransition';
import { HistorySidebar } from '@/components/chat/HistorySidebar';
import { ChatInterface } from '@/components/chat/ChatInterface';
import { AgentActivityCenter } from '@/components/agent/AgentActivityCenter';

export function ChatPage() {
  return (
    <PageTransition>
      <div data-lenis-prevent className="mx-auto h-[100svh] max-w-[1600px] px-4 pb-4 pt-24">
        <div className="grid h-full grid-cols-1 gap-4 lg:grid-cols-[260px_1fr_360px]">
          {/* History */}
          <div className="hidden min-h-0 lg:block">
            <HistorySidebar />
          </div>

          {/* Conversation */}
          <div className="min-h-0">
            <ChatInterface />
          </div>

          {/* Live activity */}
          <div className="hidden min-h-0 lg:block">
            <AgentActivityCenter />
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
