import { Module } from '@nestjs/common';
import { AgentController } from './agent.controller';
import { AgentService } from './agent.service';
import { UsageService } from './usage.service';
import { AIModule } from '../ai/ai.module';
import { ToolsModule } from '../tools/tools.module';
import { ConversationsModule } from '../conversations/conversations.module';
import { RecurrencesModule } from '../recurrences/recurrences.module';

@Module({
  imports: [AIModule, ToolsModule, ConversationsModule, RecurrencesModule],
  controllers: [AgentController],
  providers: [AgentService, UsageService],
})
export class AgentModule {}
