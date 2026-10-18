import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class OrangeMoneyWebhookGuard implements CanActivate {
  private readonly logger = new Logger(OrangeMoneyWebhookGuard.name);

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const signature = request.headers['x-orange-signature'] as string | undefined;
    const secret = process.env.ORANGE_MONEY_WEBHOOK_SECRET || 'om_webhook_sample_secret';
    const isProduction = process.env.NODE_ENV === 'production';

    // En environnement de dev local / sandbox
    if (!signature) {
      if (isProduction) {
        this.logger.error('Rejet Webhook Orange Money en production : En-tête X-Orange-Signature manquant');
        throw new UnauthorizedException('En-tête de signature Orange Money obligatoire en production');
      }
      this.logger.warn('⚠️ [SANDBOX/DEV] Webhook Orange Money reçu sans signature HMAC — accepté pour tests locaux');
      return true;
    }

    try {
      const payloadString = typeof request.body === 'string'
        ? request.body
        : JSON.stringify(request.body);

      const computedSignature = crypto
        .createHmac('sha256', secret)
        .update(payloadString)
        .digest('hex');

      // Comparaison en temps constant anti-timing attacks
      const signatureBuffer = Buffer.from(signature);
      const computedBuffer = Buffer.from(computedSignature);

      if (
        signatureBuffer.length !== computedBuffer.length ||
        !crypto.timingSafeEqual(signatureBuffer, computedBuffer)
      ) {
        this.logger.error('Signature Orange Money invalide détectée');
        throw new UnauthorizedException('Signature cryptographique Orange Money invalide');
      }

      return true;
    } catch (err: any) {
      if (err instanceof UnauthorizedException) {
        throw err;
      }
      this.logger.error('Erreur lors du calcul de la signature Orange Money', err);
      throw new UnauthorizedException('Échec de vérification de la signature du webhook Orange Money');
    }
  }
}
