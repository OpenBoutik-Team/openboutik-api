import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Une erreur interne est survenue sur le serveur';
    let error = 'Internal Server Error';
    let details: any = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();

      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        const resObj = res as Record<string, any>;
        message = resObj.message
          ? Array.isArray(resObj.message)
            ? resObj.message[0]
            : resObj.message
          : exception.message;
        error = resObj.error || exception.name;
        if (Array.isArray(resObj.message)) {
          details = resObj.message;
        }
      }
    } else if (exception instanceof Error) {
      this.logger.error(`Exception inattendue: ${exception.message}`, exception.stack);
      message = exception.message;
    } else {
      this.logger.error('Exception inconnue', exception);
    }

    response.status(status).json({
      success: false,
      statusCode: status,
      message,
      error,
      ...(details !== undefined && { details }),
      timestamp: new Date().toISOString(),
    });
  }
}
