import { IsString } from 'class-validator';

export class CancelPickupDto {
  @IsString()
  reason!: string;
}
