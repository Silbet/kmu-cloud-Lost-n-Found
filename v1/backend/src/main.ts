import { RequestMethod, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { static as expressStatic } from 'express';
import type { NextFunction, Request, Response } from 'express';
import { existsSync, mkdirSync } from 'fs';
import { join, resolve } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  app.enableCors({
    origin: true,
    credentials: true,
  });
  app.setGlobalPrefix('api', {
    exclude: [{ path: 'health', method: RequestMethod.GET }],
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );
  const uploadDir = config.get<string>('UPLOAD_DIR') ?? './uploads';
  mkdirSync(uploadDir, { recursive: true });
  app.use('/uploads', expressStatic(uploadDir));

  const webDir = resolve(config.get<string>('WEB_DIR') ?? './public');
  const indexFile = join(webDir, 'index.html');
  if (existsSync(indexFile)) {
    app.use(expressStatic(webDir));
    app.use((request: Request, response: Response, next: NextFunction) => {
      if (
        request.method === 'GET' &&
        !request.path.startsWith('/api') &&
        !request.path.startsWith('/uploads') &&
        request.path !== '/health'
      ) {
        response.sendFile(indexFile);
        return;
      }
      next();
    });
  }

  const port = config.get<number>('PORT') ?? 3000;
  await app.listen(port);
}

void bootstrap();
