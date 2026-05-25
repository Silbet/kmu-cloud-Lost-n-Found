import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { toPublicUser } from '../common/mappers';
import { PrismaService } from '../prisma/prisma.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';
import { JwtPayload } from './auth.types';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async signup(dto: SignupDto) {
    const exists = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (exists) {
      throw new ConflictException({
        error: {
          code: 'EMAIL_EXISTS',
          message: '이미 등록된 이메일입니다.',
        },
      });
    }

    const role =
      dto.role === '보관소관리자' || dto.role === 'MANAGER'
        ? UserRole.MANAGER
        : UserRole.USER;
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        name: dto.name,
        contact: dto.contact,
        role,
        pendingApproval: role === UserRole.MANAGER,
      },
    });

    return { user: toPublicUser(user) };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user) {
      throw this.invalidCredentials();
    }

    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) {
      throw this.invalidCredentials();
    }

    const token = await this.signToken({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      token,
      user: toPublicUser(user),
    };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new UnauthorizedException({
        error: {
          code: 'UNAUTHORIZED',
          message: '로그인이 필요합니다.',
        },
      });
    }
    return toPublicUser(user);
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new UnauthorizedException();
    }

    const ok = await bcrypt.compare(dto.oldPassword, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException({
        error: {
          code: 'WRONG_PASSWORD',
          message: '현재 비밀번호가 올바르지 않습니다.',
        },
      });
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: await bcrypt.hash(dto.newPassword, 10),
      },
    });
  }

  private signToken(payload: JwtPayload): Promise<string> {
    return this.jwt.signAsync(payload);
  }

  private invalidCredentials() {
    return new UnauthorizedException({
      error: {
        code: 'INVALID_CREDENTIALS',
        message: '이메일 또는 비밀번호가 올바르지 않습니다.',
      },
    });
  }
}
