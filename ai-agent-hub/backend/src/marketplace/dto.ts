import { Type } from 'class-transformer';
import { IsArray, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class StaySearchDto {
  @IsOptional() @IsString() city?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) maxPrice?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(20) guests?: number;
}

export class BookStayDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(60) nights?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(20) guests?: number;
}

export class FoodSearchDto {
  @IsOptional() @IsString() city?: string;
}

export class OrderDto {
  @IsArray() @IsString({ each: true }) itemIds: string[] = [];
}
