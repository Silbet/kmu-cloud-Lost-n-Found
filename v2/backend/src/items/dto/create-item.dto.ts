import { IsDateString, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateItemDto {
  @IsString()
  @MinLength(1)
  itemName!: string;

  @IsString()
  @MinLength(1)
  category!: string;

  @IsString()
  @MinLength(1)
  foundPlace!: string;

  @IsDateString()
  foundDate!: string;

  @IsString()
  description!: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;
}
