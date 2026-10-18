import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class WaveWebhookGuard implements CanActivate {
  private readonly logger = new Logger(WaveWebhookGuard.name);

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const signature = request.headers['x-wave-signature'] as string | undefined;
    const secret = process.env.WAVE_WEBHOOK_SECRET || 'whsec_sample_wave_dev_secret';
    const isProduction = process.env.NODE_ENV === 'production';

    // En environnement de dev local / sandbox
    if (!signature) {
      if (isProduction) {
        this.logger.error('Rejet Webhook Wave en production : En-tête X-Wave-Signature manquant');
        throw new UnauthorizedException('En-tête de signature Wave obligatoire en production');
      }
      this.logger.warn('⚠️ [SANDBOX/DEV] Webhook Wave reçu sans signature HMAC — accepté pour tests locaux');
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

      // Comparaison en temps constant pour prévenir les attaques temporelles (Timing Attacks)
      const signatureBuffer = Buffer.from(signature);
      const computedBuffer = Buffer.from(computedSignature);

      if (
        signatureBuffer.length !== computedBuffer.length ||
        !crypto.timingSafeEqual(signatureBuffer, computedBuffer)
      ) {
        this.logger.error('Signature Wave invalide détectée');
        throw new UnauthorizedException('Signature cryptographique Wave invalide');
      }

      return true;
    } catch (err: any) {
      if (err instanceof UnauthorizedException) {
        throw err;
      }
      this.logger.error('Erreur lors du calcul de la signature Wave', err);
      throw new UnauthorizedException('Échec de vérification de la signature du webhook Wave');
    }
  }
}
