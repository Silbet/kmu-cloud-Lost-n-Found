import { IsInt, IsOptional, Min } from 'class-validator';

export class UpdateConfigDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  longUnclaimedDays?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  pickupAutoCancelDays?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  matchDateRangeDays?: number;
}
