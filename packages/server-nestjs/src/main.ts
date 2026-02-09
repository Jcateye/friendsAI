import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const port = process.env.PORT ?? 3000;

  const isDev = !process.env.NODE_ENV || process.env.NODE_ENV === 'dev' || process.env.NODE_ENV === 'development';

  const app = await NestFactory.create(AppModule, {
    // 开发环境打开 debug 日志，生产环境默认到 log 级别
    logger: isDev ? ['error', 'warn', 'log', 'debug'] : ['error', 'warn', 'log'],
  });

  // 生产级 CORS 配置
  app.enableCors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      const allowedOrigins = process.env.CORS_ORIGINS?.split(',') || [];

      // 允许无 origin 的请求（如移动端原生、Postman）
      if (!origin) {
        return callback(null, true);
      }

      // 开发环境允许 localhost 和局域网 IP（NODE_ENV 未设置时默认为开发环境）
      if (isDev) {
        if (
          origin.includes('localhost') ||
          origin.includes('127.0.0.1') ||
          origin.includes('192.168.') ||
          origin.includes('10.') ||
          origin.includes('172.')
        ) {
          return callback(null, true);
        }
      }

      // 生产环境检查白名单
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['X-Total-Count'],
    maxAge: 86400, // 24小时缓存 preflight 请求
  });

  app.setGlobalPrefix('v1');

  // Swagger / OpenAPI configuration
  const config = new DocumentBuilder()
    .setTitle('FriendsAI API')
    .setDescription('FriendsAI Backend API Documentation')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('api', app, document, {
    // 让 Postman 等客户端可以直接通过 URL 导入 OpenAPI 3 规范
    // 示例： http://localhost:3000/api/openapi.json
    jsonDocumentUrl: 'openapi.json',
  });

  await app.listen(port);
  logger.log(`🚀 Server is running on http://localhost:${port}`);
  logger.log(`📚 Swagger docs available at http://localhost:${port}/api`);
}
bootstrap().catch((error) => {
  const logger = new Logger('Bootstrap');
  logger.error('❌ Bootstrap failed', error instanceof Error ? error.stack : JSON.stringify(error));
  process.exit(1);
});
