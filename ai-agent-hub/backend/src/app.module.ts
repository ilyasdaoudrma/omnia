import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { UserOrIpThrottlerGuard } from './common/user-or-ip-throttler.guard';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { AIModule } from './ai/ai.module';
import { ToolsModule } from './tools/tools.module';
import { AgentModule } from './agent/agent.module';
import { ConversationsModule } from './conversations/conversations.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { MarketplaceModule } from './marketplace/marketplace.module';
import { RecurrencesModule } from './recurrences/recurrences.module';
import { HealthController } from './health/health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    // Baseline rate limit for every route (per user-or-IP); tighter caps are set
    // per-endpoint with @Throttle (e.g. the Groq-backed /agent/run).
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    PrismaModule,
    AuthModule,
    UsersModule,
    AIModule,
    ToolsModule,
    AgentModule,
    ConversationsModule,
    DashboardModule,
    MarketplaceModule,
    RecurrencesModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: UserOrIpThrottlerGuard }],
})
export class AppModule {}
