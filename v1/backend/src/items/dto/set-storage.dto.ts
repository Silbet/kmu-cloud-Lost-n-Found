import { IsString, MinLength } from 'class-validator';

export class SetStorageDto {
  @IsString()
  @MinLength(1)
  storageLocation!: string;
}
