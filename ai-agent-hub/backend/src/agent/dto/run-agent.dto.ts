import { Type } from 'class-transformer';
import { IsArray, IsIn, IsNumber, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';

export class AccountOrderItemDto {
  @IsString() @MaxLength(200) name!: string;
  @IsNumber() qty!: number;
  @IsNumber() price!: number;
}

export class AccountOrderDto {
  @IsString() id!: string;
  @IsOptional() @IsString() vendorId?: string;
  @IsOptional() @IsString() @MaxLength(200) vendorName?: string;
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => AccountOrderItemDto) items?: AccountOrderItemDto[];
  @IsOptional() @IsNumber() total?: number;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() createdAt?: string;
}

export class AccountBookingDto {
  @IsString() id!: string;
  @IsOptional() @IsString() listingId?: string;
  @IsOptional() @IsString() @MaxLength(200) title?: string;
  @IsOptional() @IsString() @MaxLength(120) city?: string;
  @IsOptional() @IsNumber() nights?: number;
  @IsOptional() @IsNumber() guests?: number;
  @IsOptional() @IsNumber() total?: number;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() createdAt?: string;
}

export class AccountRideDto {
  @IsString() id!: string;
  @IsOptional() @IsString() rideClassId?: string;
  @IsOptional() @IsString() @MaxLength(120) className?: string;
  @IsOptional() @IsString() @MaxLength(120) vehicle?: string;
  @IsOptional() @IsString() @MaxLength(200) pickup?: string;
  @IsOptional() @IsString() @MaxLength(200) dropoff?: string;
  @IsOptional() @IsNumber() distanceKm?: number;
  @IsOptional() @IsNumber() fare?: number;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() createdAt?: string;
}

export class AccountDto {
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => AccountOrderDto) eatsOrders?: AccountOrderDto[];
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => AccountBookingDto) stayBookings?: AccountBookingDto[];
  // Without this, `whitelist: true` SILENTLY STRIPS rideTrips → "you have no rides".
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => AccountRideDto) rideTrips?: AccountRideDto[];
}

export class LocationDto {
  @IsNumber()
  lat!: number;

  @IsNumber()
  lon!: number;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  country?: string;
}

export class ChatMessageDto {
  @IsString()
  id!: string;

  @IsIn(['user', 'assistant', 'system'])
  role!: 'user' | 'assistant' | 'system';

  @IsString()
  @MaxLength(8000)
  content!: string;

  @IsNumber()
  createdAt!: number;
}

export class RunAgentDto {
  @IsString()
  @MaxLength(2000)
  prompt!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChatMessageDto)
  @IsOptional()
  history: ChatMessageDto[] = [];

  @IsOptional()
  @IsIn(['claude', 'openai', 'groq'])
  provider?: 'claude' | 'openai' | 'groq';

  @IsOptional()
  @IsString()
  conversationId?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => LocationDto)
  location?: LocationDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => AccountDto)
  account?: AccountDto;
}
