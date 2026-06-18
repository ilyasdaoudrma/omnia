import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { PrismaService } from '../prisma/prisma.service';

@SkipThrottle() // liveness/monitoring must never be rate-limited
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  check() {
    return {
      status: 'ok',
      service: 'omnia-rides',
      db: this.prisma.connected ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString(),
    };
  }
}
