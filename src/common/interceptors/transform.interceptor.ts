import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, map } from 'rxjs';

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor {
  intercept(_ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map((data: T) => ({
        success: true,
        data: (data as Record<string, unknown>)?.data ?? data,
        meta: (data as Record<string, unknown>)?.meta ?? undefined,
      })),
    );
  }
}
