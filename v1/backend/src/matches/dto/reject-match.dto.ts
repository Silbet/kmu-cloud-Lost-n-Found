import { IsOptional, IsString } from 'class-validator';

export class RejectMatchDto {
  @IsOptional()
  @IsString()
  reason?: string;
}
