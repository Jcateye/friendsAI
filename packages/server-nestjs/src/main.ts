import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from 'nestjs-pino'; // 导入 Pino Logger

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true }); // 开启日志缓冲
  app.useLogger(app.get(Logger)); // 替换默认日志器
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
