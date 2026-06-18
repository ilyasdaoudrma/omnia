import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import type { User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { AgentTask, Recommendation } from '../ai/agent.types';

@Injectable()
export class ConversationsService {
  private readonly logger = new Logger(ConversationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  private canPersist(user: User | null): user is User {
    return Boolean(user && this.prisma.connected);
  }

  /** Find or create the conversation this turn belongs to. Returns id or null (anonymous). */
  async ensureConversation(user: User | null, conversationId: string | undefined, firstPrompt: string): Promise<string | null> {
    if (!this.canPersist(user)) return null;
    try {
      if (conversationId) {
        const existing = await this.prisma.conversation.findUnique({ where: { id: conversationId } });
        if (existing && existing.userId === user.id) return existing.id;
      }
      const created = await this.prisma.conversation.create({
        data: { userId: user.id, title: firstPrompt.slice(0, 60) },
      });
      return created.id;
    } catch (err) {
      this.logger.error(`ensureConversation failed: ${(err as Error).message}`);
      return null;
    }
  }

  async appendUserMessage(conversationId: string | null, content: string) {
    if (!conversationId || !this.prisma.connected) return;
    try {
      await this.prisma.message.create({ data: { conversationId, role: 'user', content } });
    } catch (err) {
      this.logger.error(`appendUserMessage failed: ${(err as Error).message}`);
    }
  }

  /** Persist the assistant reply + recommendations. Returns the message id (always defined). */
  async appendAssistantMessage(
    conversationId: string | null,
    content: string,
    recommendations: Recommendation[],
    tasks: AgentTask[],
  ): Promise<string> {
    if (!conversationId || !this.prisma.connected) return `msg_${Date.now()}`;
    try {
      const message = await this.prisma.message.create({
        data: {
          conversationId,
          role: 'assistant',
          content,
          recommendations: recommendations as unknown as object,
        },
      });
      if (tasks.length) {
        await this.prisma.task.createMany({
          data: tasks.map((t, i) => ({ conversationId, title: t.title, tool: t.tool, status: t.status, order: i })),
        });
      }
      await this.prisma.conversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } });
      return message.id;
    } catch (err) {
      this.logger.error(`appendAssistantMessage failed: ${(err as Error).message}`);
      return `msg_${Date.now()}`;
    }
  }

  // ── REST: read/manage history ──────────────────────────────

  async list(user: User) {
    if (!this.prisma.connected) return [];
    return this.prisma.conversation.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: 'desc' },
      select: { id: true, title: true, createdAt: true, updatedAt: true, _count: { select: { messages: true } } },
    });
  }

  async get(user: User, id: string) {
    const convo = await this.prisma.conversation.findUnique({
      where: { id },
      include: { messages: { orderBy: { createdAt: 'asc' } }, tasks: { orderBy: { order: 'asc' } } },
    });
    if (!convo) throw new NotFoundException('Conversation not found');
    if (convo.userId !== user.id) throw new ForbiddenException();
    return convo;
  }

  async remove(user: User, id: string) {
    const convo = await this.prisma.conversation.findUnique({ where: { id } });
    if (!convo) throw new NotFoundException('Conversation not found');
    if (convo.userId !== user.id) throw new ForbiddenException();
    await this.prisma.conversation.delete({ where: { id } });
    return { ok: true };
  }
}
