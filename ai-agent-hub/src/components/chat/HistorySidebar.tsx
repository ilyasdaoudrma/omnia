import { useEffect } from 'react';
import { Plus, MessageSquare, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useAgentStore } from '@/store/agentStore';
import { authEnabled } from '@/lib/auth';
import { cn } from '@/lib/utils';

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  return days === 1 ? 'Yesterday' : `${days}d ago`;
}

export function HistorySidebar() {
  const {
    conversations,
    conversationsLoading,
    conversationId,
    newConversation,
    loadConversation,
    refreshConversations,
    removeConversation,
  } = useAgentStore();

  useEffect(() => {
    void refreshConversations();
  }, [refreshConversations]);

  return (
    <div className="flex h-full flex-col gap-4">
      <Button variant="glass" className="w-full justify-start gap-2" onClick={newConversation}>
        <Plus className="h-4 w-4" /> New conversation
      </Button>

      <div className="mask-fade-y min-h-0 flex-1 overflow-y-auto pr-1">
        <p className="mb-2 px-2 text-xs uppercase tracking-[0.2em] text-white/30">Recent</p>

        {conversationsLoading && conversations.length === 0 ? (
          <div className="flex items-center gap-2 px-3 py-3 text-sm text-white/40">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : conversations.length === 0 ? (
          <p className="px-3 py-2 text-sm leading-relaxed text-white/35">
            {authEnabled
              ? 'No saved chats yet. Sign in and start a conversation — it will appear here.'
              : 'Add a Clerk key and sign in to save your conversations.'}
          </p>
        ) : (
          <ul className="space-y-1">
            {conversations.map((c) => (
              <li key={c.id}>
                <div
                  className={cn(
                    'group flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors',
                    c.id === conversationId ? 'bg-white/[0.07]' : 'hover:bg-white/[0.04]',
                  )}
                >
                  <button className="flex min-w-0 flex-1 items-center gap-3" onClick={() => loadConversation(c.id)} data-cursor="hover">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-white/5 text-white/60">
                      <MessageSquare className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-white/80">{c.title}</span>
                      <span className="block text-xs text-white/35">{relativeTime(c.updatedAt)}</span>
                    </span>
                  </button>
                  <button
                    onClick={() => removeConversation(c.id)}
                    className="shrink-0 rounded-lg p-1.5 text-white/30 opacity-0 transition-all hover:bg-white/10 hover:text-white group-hover:opacity-100"
                    title="Delete"
                    data-cursor="hover"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="glass rounded-2xl p-3 text-xs text-white/45">
        <p className="flex items-center gap-1.5 font-medium text-white/70">
          <MessageSquare className="h-3.5 w-3.5" /> Memory
        </p>
        <p className="mt-1 leading-relaxed">
          {authEnabled ? 'Signed-in chats are saved to your account.' : 'Sign in to keep your conversations across sessions.'}
        </p>
      </div>
    </div>
  );
}
