import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException ? exception.getResponse() : 'Internal server error';

    if (status >= 500) {
      this.logger.error(`${request.method} ${request.url}`, exception);
    }

    response.status(status).json({
      success: false,
      statusCode: status,
      message:
        typeof message === 'string' ? message : (message as Record<string, unknown>)?.message,
      errors:
        typeof message === 'object' ? (message as Record<string, unknown>)?.errors : undefined,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
