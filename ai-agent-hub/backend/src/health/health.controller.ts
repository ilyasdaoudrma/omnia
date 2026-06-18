import { Controller, ForbiddenException, Get, Headers, Query } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SkipThrottle } from '@nestjs/throttler';
import { PrismaService } from '../prisma/prisma.service';
import { AIService } from '../ai/ai.service';

@SkipThrottle() // liveness/monitoring must never be rate-limited
@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly ai: AIService,
  ) {}

  /** Public liveness — minimal, no operational detail (key counts live behind /health/keys). */
  @Get()
  check() {
    return {
      status: 'ok',
      db: this.prisma.connected ? 'connected' : 'disconnected',
      aiProvider: this.config.get('AI_PROVIDER') ?? 'mock',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Detailed Groq key-pool status (total / available / active / cooldowns).
   * Gated: requires HEALTH_ADMIN_TOKEN (via ?token= or x-admin-token header) when set;
   * otherwise allowed only outside production. Never returns raw key material.
   */
  @Get('keys')
  keys(@Query('token') token?: string, @Headers('x-admin-token') headerToken?: string) {
    const required = this.config.get<string>('HEALTH_ADMIN_TOKEN');
    const isProd = (this.config.get<string>('NODE_ENV') ?? 'development') === 'production';
    if (required) {
      if ((headerToken ?? token) !== required) throw new ForbiddenException('Invalid admin token');
    } else if (isProd) {
      throw new ForbiddenException('Key-pool status is disabled in production without HEALTH_ADMIN_TOKEN');
    }
    return {
      aiProvider: this.config.get('AI_PROVIDER') ?? 'mock',
      groqKeys: this.ai.keyPoolStatus(),
      timestamp: new Date().toISOString(),
    };
  }
}
