import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import type { User } from '@prisma/client';
import { ReviewsService } from './reviews.service';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

class CreateReviewDto {
  @Type(() => Number) @IsInt() @Min(1) @Max(5) rating!: number;
  @IsOptional() @IsString() @MaxLength(600) comment?: string;
}

@Controller('listings/:id/reviews')
export class ReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  /** Public — anyone can read a place's reviews. */
  @Get()
  list(@Param('id') id: string) {
    return this.reviews.listForListing(id);
  }

  /** Signed-in guests leave a review. */
  @Post()
  @UseGuards(AuthGuard)
  create(@CurrentUser() user: User, @Param('id') id: string, @Body() dto: CreateReviewDto) {
    return this.reviews.create(user, id, dto);
  }
}
