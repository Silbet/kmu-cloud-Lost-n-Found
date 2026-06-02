import { NestFactory } from '@nestjs/core';
import { configure as serverlessExpress } from '@vendia/serverless-express';
import { AppModule } from '../app.module';

let cachedHandler: any;

async function bootstrap() {
  if (!cachedHandler) {
    const app = await NestFactory.create(AppModule);
    app.setGlobalPrefix('api');
    app.enableCors();
    await app.init();
    cachedHandler = serverlessExpress({ app: app.getHttpAdapter().getInstance() });
  }
  return cachedHandler;
}

export async function handler(event: unknown, context: unknown, callback: unknown) {
  const server = await bootstrap();
  return server(event, context, callback);
}
