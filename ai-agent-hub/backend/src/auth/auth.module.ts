import { Global, Module } from '@nestjs/common';
import { ClerkService } from './clerk.service';
import { AuthGuard } from './auth.guard';
import { OptionalAuthGuard } from './optional-auth.guard';
import { UsersModule } from '../users/users.module';

@Global()
@Module({
  imports: [UsersModule],
  providers: [ClerkService, AuthGuard, OptionalAuthGuard],
  exports: [ClerkService, AuthGuard, OptionalAuthGuard, UsersModule],
})
export class AuthModule {}
