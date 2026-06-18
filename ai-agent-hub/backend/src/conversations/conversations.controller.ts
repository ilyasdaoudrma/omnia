import { Controller, Delete, Get, Param, UseGuards } from '@nestjs/common';
import type { User } from '@prisma/client';
import { ConversationsService } from './conversations.service';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller('conversations')
@UseGuards(AuthGuard)
export class ConversationsController {
  constructor(private readonly conversations: ConversationsService) {}

  @Get()
  list(@CurrentUser() user: User) {
    return this.conversations.list(user);
  }

  @Get(':id')
  get(@CurrentUser() user: User, @Param('id') id: string) {
    return this.conversations.get(user, id);
  }

  @Delete(':id')
  remove(@CurrentUser() user: User, @Param('id') id: string) {
    return this.conversations.remove(user, id);
  }
}
