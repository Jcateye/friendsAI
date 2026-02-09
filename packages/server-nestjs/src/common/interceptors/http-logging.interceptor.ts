import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class HttpLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(HttpLoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const now = Date.now();

    const http = context.switchToHttp();
    const request = http.getRequest<Request & { user?: unknown }>();

    const method = (request as any)?.method;
    const url = (request as any)?.url;
    const headers = (request as any)?.headers ?? {};
    const query = (request as any)?.query ?? {};
    const params = (request as any)?.params ?? {};
    const body = (request as any)?.body ?? {};

    // 注意：这里打的是 debug 级别日志，默认只有在开启 debug 级别时才会输出
    this.logger.debug({
      message: 'Incoming HTTP request',
      method,
      url,
      headers,
      query,
      params,
      body,
    });

    return next.handle().pipe(
      tap((responseBody) => {
        const response = http.getResponse<Response & { statusCode?: number }>();
        const statusCode = (response as any)?.statusCode;
        const durationMs = Date.now() - now;

        this.logger.debug({
          message: 'Outgoing HTTP response',
          method,
          url,
          statusCode,
          durationMs,
          body: responseBody,
        });
      }),
    );
  }
}


