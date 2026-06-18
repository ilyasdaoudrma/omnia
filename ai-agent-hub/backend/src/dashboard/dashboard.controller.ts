import { Controller, Get, UseGuards } from '@nestjs/common';
import type { User } from '@prisma/client';
import { DashboardService } from './dashboard.service';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller('dashboard')
@UseGuards(AuthGuard)
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get()
  overview(@CurrentUser() user: User) {
    return this.dashboard.overview(user);
  }
}
