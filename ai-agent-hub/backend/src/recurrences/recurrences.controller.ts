import { Controller, Delete, ForbiddenException, Get, Headers, NotFoundException, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import type { User } from '@prisma/client';
import { RecurrencesService } from './recurrences.service';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller('recurrences')
export class RecurrencesController {
  constructor(
    private readonly recurrences: RecurrencesService,
    private readonly config: ConfigService,
  ) {}

  /** The signed-in user's recurring tasks. */
  @Get()
  @UseGuards(AuthGuard)
  listMine(@CurrentUser() user: User) {
    return this.recurrences.listMine(user.clerkId);
  }

  /** Cancel one of the user's recurring tasks. */
  @Delete(':id')
  @UseGuards(AuthGuard)
  async cancel(@CurrentUser() user: User, @Param('id') id: string) {
    const ok = await this.recurrences.cancel(user.clerkId, id);
    if (!ok) throw new NotFoundException('Recurrence not found');
    return { ok: true };
  }

  /**
   * Ops/test hook: fire all due recurrences now. The cron runs this on a schedule;
   * this route lets ops trigger it server-to-server without a Clerk session.
   * Defence in depth: shared secret + a tight rate limit + an OPTIONAL IP allowlist
   * (RECURRENCE_ADMIN_IPS). For hosting, keep it on an internal network too.
   */
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @Post('admin/run-due')
  async runDue(@Req() req: Request, @Headers('x-omnia-agent-secret') secret?: string) {
    const allow = (this.config.get<string>('RECURRENCE_ADMIN_IPS') ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    // In production this manual hook is OFF by default — the cron already fires due
    // tasks. It only turns on if you deliberately set an IP allowlist (ops use).
    const isProd = (this.config.get<string>('NODE_ENV') ?? 'development') === 'production';
    if (isProd && !allow.length) throw new ForbiddenException('Disabled in production');

    const expected = this.config.get<string>('OMNIA_AGENT_SECRET');
    if (!expected || secret !== expected) throw new ForbiddenException('Forbidden');

    if (allow.length) {
      const ip = (req.ips?.length ? req.ips[0] : req.ip) ?? '';
      if (!allow.includes(ip)) throw new ForbiddenException('Forbidden');
    }

    const fired = await this.recurrences.runDue();
    return { ok: true, fired };
  }
}
