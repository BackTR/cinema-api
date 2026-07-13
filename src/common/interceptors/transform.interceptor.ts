import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, map } from 'rxjs';

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor {
  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map((data: T) => {
        const response = ctx.switchToHttp().getResponse();
        if (response && response.headersSent) {
          return data;
        }
        return {
          success: true,
          data: (data as Record<string, unknown>)?.data ?? data,
          meta: (data as Record<string, unknown>)?.meta ?? undefined,
        };
      }),
    );
  }
}
