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
    let details: string[] | undefined = undefined;

    const isProduction = process.env.NODE_ENV === 'production';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();

      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        const resObj = res as Record<string, unknown>;
        if (typeof resObj.message === 'string') {
          message = resObj.message;
        } else if (Array.isArray(resObj.message)) {
          message = typeof resObj.message[0] === 'string' ? resObj.message[0] : exception.message;
          details = resObj.message.filter((m): m is string => typeof m === 'string');
        } else {
          message = exception.message;
        }
        error = typeof resObj.error === 'string' ? resObj.error : exception.name;
      }
    } else if (
      typeof exception === 'object' &&
      exception !== null &&
      'code' in exception &&
      typeof (exception as { code: unknown }).code === 'string'
    ) {
      // Interception des erreurs Prisma (P2002, P2025, P2003...)
      const prismaCode = (exception as { code: string }).code;
      this.logger.warn(`Erreur Prisma interceptée : [${prismaCode}]`, (exception as any)?.meta?.driverAdapterError || (exception as any)?.message);

      switch (prismaCode) {
        case 'P2002':
          status = HttpStatus.CONFLICT;
          message = 'Une ressource avec ces données existe déjà (contrainte unique violée)';
          error = 'Conflict';
          break;
        case 'P2025':
          status = HttpStatus.NOT_FOUND;
          message = 'L’enregistrement demandé est introuvable ou n’existe plus';
          error = 'Not Found';
          break;
        case 'P2003':
          status = HttpStatus.BAD_REQUEST;
          message = 'Référence associée invalide ou introuvable (clé étrangère)';
          error = 'Bad Request';
          break;
        default:
          status = HttpStatus.BAD_REQUEST;
          message = isProduction ? 'Requête BDD non valide' : `Erreur BDD [${prismaCode}]`;
          error = 'Database Error';
      }
    } else if (exception instanceof Error) {
      this.logger.error(`Exception inattendue: ${exception.message}`, exception.stack);
      message = isProduction
        ? 'Une erreur interne est survenue sur le serveur'
        : exception.message;
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
