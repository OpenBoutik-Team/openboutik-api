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

  // 2. Configuration CORS pour les fronts Marketplace (3000) et Seller/Admin (3001)
  const allowedOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map((o) => o.trim())
    : ['http://localhost:3000', 'http://localhost:3001'];

  app.enableCors({
    origin: allowedOrigins,
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
