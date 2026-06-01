import { IsDateString, IsString, MinLength } from 'class-validator';

export class CreateReportDto {
  @IsString()
  @MinLength(1)
  itemName!: string;

  @IsString()
  @MinLength(1)
  category!: string;

  @IsString()
  @MinLength(1)
  lostPlace!: string;

  @IsDateString()
  lostDate!: string;

  @IsString()
  description!: string;

  @IsString()
  @MinLength(1)
  reporterContact!: string;
}
