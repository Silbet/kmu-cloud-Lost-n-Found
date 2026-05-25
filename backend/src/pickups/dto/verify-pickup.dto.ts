import { IsString, MinLength } from 'class-validator';

export class VerifyPickupDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsString()
  @MinLength(1)
  contact!: string;

  @IsString()
  @MinLength(1)
  code!: string;
}
