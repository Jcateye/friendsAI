import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const port = process.env.PORT ?? 3000;

  const app = await NestFactory.create(AppModule);

  // 生产级 CORS 配置
  app.enableCors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      const allowedOrigins = process.env.CORS_ORIGINS?.split(',') || [];

      // 允许无 origin 的请求（如移动端原生、Postman）
      if (!origin) {
        return callback(null, true);
      }

      // 开发环境允许 localhost 和局域网 IP（NODE_ENV 未设置时默认为开发环境）
      const isDev = !process.env.NODE_ENV || process.env.NODE_ENV === 'dev';
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

  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('FriendsAI API')
    .setDescription('FriendsAI Backend API Documentation')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(port);
  console.log(`🚀 Server is running on http://localhost:${port}`);
  console.log(`📚 Swagger docs available at http://localhost:${port}/api`);
}
bootstrap().catch((error) => {
  console.error('❌ Bootstrap failed:', error);
  process.exit(1);
});
