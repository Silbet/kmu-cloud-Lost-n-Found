import { HttpException, HttpStatus } from '@nestjs/common';

export class ApiError extends HttpException {
  constructor(status: HttpStatus, code: string, message: string) {
    super({ error: { code, message } }, status);
  }
}
