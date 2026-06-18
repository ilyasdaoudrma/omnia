import { Body, Controller, Get, HttpException, HttpStatus, Post, Req, Res, UseGuards } from '@nestjs/common';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import type { User } from '@prisma/client';
import { AgentService } from './agent.service';
import { UsageService, type UsageSnapshot } from './usage.service';
import { RunAgentDto } from './dto/run-agent.dto';
import { OptionalAuthGuard } from '../auth/optional-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { trackerKey } from '../common/tracker-key';

@Controller('agent')
export class AgentController {
  constructor(
    private readonly agent: AgentService,
    private readonly usage: UsageService,
  ) {}

  /**
   * GET /agent/usage — how many agent requests this user/IP has left this minute
   * and today, for the UI meter. Read-only, so it's exempt from throttling.
   */
  @SkipThrottle()
  @Get('usage')
  getUsage(@Req() req: Request): Promise<UsageSnapshot> {
    return this.usage.snapshot(trackerKey(req));
  }

  /**
   * POST /agent/run — streams the agent loop as Server-Sent Events.
   * Public (OptionalAuthGuard): runs anonymously, personalizes & persists when
   * a valid Clerk token is supplied. Emits one JSON AgentEvent per SSE frame,
   * terminated by `data: [DONE]`.
   */
  // The agent loop makes paid Groq calls — cap it tightly per user-or-IP so it
  // can't be spammed. 20/min (throttler) + a daily cap (UsageService) below.
  @Throttle({ default: { ttl: 60_000, limit: 20 } })
  @Post('run')
  @UseGuards(OptionalAuthGuard)
  async run(
    @Body() dto: RunAgentDto,
    @CurrentUser() user: User | null,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    // Daily cap (the throttler only enforces the per-minute window). Persisted in
    // Postgres so it survives restarts. Count this run against the user/IP bucket.
    const key = trackerKey(req);
    if (await this.usage.isDayExceeded(key)) {
      throw new HttpException('Daily request limit reached. Please try again tomorrow.', HttpStatus.TOO_MANY_REQUESTS);
    }
    await this.usage.record(key);

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // disable proxy buffering (nginx)
    res.flushHeaders();

    let clientGone = false;
    req.on('close', () => {
      clientGone = true;
    });

    try {
      for await (const event of this.agent.run(
        {
          prompt: dto.prompt,
          history: dto.history ?? [],
          provider: dto.provider,
          conversationId: dto.conversationId,
          location: dto.location,
          account: dto.account,
        },
        user,
      )) {
        if (clientGone) break;
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      }
    } finally {
      if (!clientGone) {
        res.write('data: [DONE]\n\n');
        res.end();
      }
    }
  }
}
