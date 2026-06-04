import { IsIn, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp'] as const;

export class CreatePresignedUploadDto {
  @IsString()
  @MaxLength(160)
  @Matches(/^[^/\\]+$/)
  filename!: string;

  @IsIn(allowedImageTypes)
  contentType!: (typeof allowedImageTypes)[number];

  @IsOptional()
  @IsString()
  @MaxLength(40)
  purpose?: string;
}
