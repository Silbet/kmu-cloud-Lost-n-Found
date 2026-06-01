import { IsEmail, IsIn, IsString, MinLength } from 'class-validator';

export class SignupDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsString()
  @MinLength(1)
  name!: string;

  @IsString()
  @MinLength(1)
  contact!: string;

  @IsIn(['일반사용자', '보관소관리자', 'USER', 'MANAGER'])
  role!: '일반사용자' | '보관소관리자' | 'USER' | 'MANAGER';
}
