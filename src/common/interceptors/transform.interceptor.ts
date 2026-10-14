import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ResponseEnvelope<T> {
  success: boolean;
  data: T;
  meta?: any;
  message: string;
  timestamp: string;
}

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, ResponseEnvelope<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ResponseEnvelope<T>> {
    return next.handle().pipe(
      map((res) => {
        // Si le contrôleur a déjà retourné une structure spécifique avec message ou meta
        const isObject = res && typeof res === 'object' && !Array.isArray(res);
        const hasCustomData = isObject && 'data' in res;
        const message = isObject && 'message' in res ? res.message : 'Opération effectuée avec succès';
        const meta = isObject && 'meta' in res ? res.meta : undefined;
        const data = hasCustomData ? res.data : res;

        return {
          success: true,
          data,
          ...(meta !== undefined && { meta }),
          message,
          timestamp: new Date().toISOString(),
        };
      }),
    );
  }
}
