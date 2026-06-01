import { IsString, MinLength } from 'class-validator';

export class ClaimItemDto {
  @IsString()
  @MinLength(1)
  reportId!: string;
}
