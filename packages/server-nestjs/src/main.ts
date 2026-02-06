import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 生产级 CORS 配置
  app.enableCors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      const allowedOrigins = process.env.CORS_ORIGINS?.split(',') || [];

      // 允许无 origin 的请求（如移动端原生、Postman）
      if (!origin) {
        return callback(null, true);
      }

      // 开发环境允许 localhost 和局域网 IP
      if (process.env.NODE_ENV === 'development') {
        if (
          origin.includes('localhost') ||
          origin.includes('127.0.0.1') ||
          origin.includes('192.168.')
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

  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('FriendsAI API')
    .setDescription('FriendsAI Backend API Documentation')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
