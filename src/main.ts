import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { TransformInterceptor, AllExceptionsFilter } from './common';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // 1. Sécurité des en-têtes HTTP
  app.use(helmet());

  // 2. Configuration CORS dynamique pour les sous-domaines Wildcard (*.openboutik.sn), Localhost et Vercel
  const explicitOrigins = (process.env.CORS_ORIGINS || process.env.FRONTEND_URL || 'http://localhost:3000,http://localhost:3001')
    .split(',')
    .map((o) => o.trim().toLowerCase())
    .filter(Boolean);

  const wildcardPatterns = [
    /^http:\/\/([a-z0-9-]+\.)?localhost(:\d+)?$/i,
    /^https:\/\/([a-z0-9-]+\.)?openboutik\.(sn|com)$/i,
    /^https:\/\/([a-z0-9-]+\.)?vercel\.app$/i,
  ];

  app.enableCors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // 1. Appels directs sans Origin (SSR Next.js, apps mobiles, requêtes cURL, Webhooks)
      if (!origin) {
        return callback(null, true);
      }

      const lowerOrigin = origin.toLowerCase();

      // 2. Origines explicitement déclarées dans .env
      if (explicitOrigins.includes(lowerOrigin)) {
        return callback(null, true);
      }

      // 3. Validation par regex Wildcard (sous-domaines et previews)
      const isAllowedByPattern = wildcardPatterns.some((pattern) => pattern.test(lowerOrigin));
      if (isAllowedByPattern) {
        return callback(null, true);
      }

      logger.warn(`Requête CORS bloquée pour l'origine : ${origin}`);
      return callback(new Error(`CORS non autorisé pour l'origine : ${origin}`), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  });

  // 3. Préfixe global d'API
  const globalPrefix = process.env.API_PREFIX || 'api/v1';
  app.setGlobalPrefix(globalPrefix);

  // 4. Validation globale stricte des DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // 5. Intercepteurs et Filtres globaux (Contrat JSON unifié)
  app.useGlobalInterceptors(new TransformInterceptor());
  app.useGlobalFilters(new AllExceptionsFilter());

  // 6. Documentation interactive Swagger / OpenAPI
  const swaggerConfig = new DocumentBuilder()
    .setTitle('OpenBoutik API')
    .setDescription(
      "API REST officielle de la plateforme hybride OpenBoutik (Marketplace multi-vendeurs & SaaS commerçant au Sénégal).\n\n" +
      "Dev 1 (Marketplace) : http://localhost:3000\n" +
      "Dev 2 (Seller & Super-Admin) : http://localhost:3001\n" +
      "Devise officielle : FCFA (XOF) en entiers stricts.",
    )
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: "Entrez votre Access Token JWT (format: Bearer <token>)",
        in: 'header',
      },
      'JWT-auth',
    )
    .addTag('Authentification', 'Inscription, connexion, renouvellement de tokens JWT et rôles')
    .addTag('Boutiques (SaaS)', 'Gestion des boutiques marchandes, vitrines et personnalisation')
    .addTag('Catalogue & Produits', 'Catégories et produits en FCFA avec gestion des stocks')
    .addTag('Commandes & Séquestre', 'Création de commande, livraison Tiak-Tiak et déblocage de séquestre (Escrow)')
    .addTag('Portefeuille Vendeur', 'Consultation des soldes bloqués/disponibles et demandes de retrait Mobile Money')
    .addTag('Litiges (Disputes)', 'Signalement de problèmes par le client et suivi des réclamations')
    .addTag('Super-Admin', 'Espace d’arbitrage des litiges, supervision du séquestre et gouvernance plateforme')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
    customSiteTitle: 'OpenBoutik API - Documentation Swagger',
  });

  const port = process.env.PORT || 4000;
  await app.listen(port);

  logger.log(`🚀 API OpenBoutik démarrée sur : http://localhost:${port}/${globalPrefix}`);
  logger.log(`📖 Documentation Swagger disponible sur : http://localhost:${port}/api/docs`);
}

bootstrap();
