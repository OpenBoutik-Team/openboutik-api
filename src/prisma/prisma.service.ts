import 'dotenv/config';
import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '../generated/prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    const rawUrl =
      process.env.DATABASE_URL || 'mysql://root:@localhost:3306/openboutik_db';
    let connectionString = rawUrl;
    try {
      const parsed = new URL(rawUrl);
      if (!parsed.searchParams.has('connectionLimit')) {
        parsed.searchParams.set('connectionLimit', '2');
      }
      connectionString = parsed.toString();
    } catch {
      connectionString = rawUrl;
    }
    const adapter = new PrismaMariaDb(connectionString);
    super({ adapter });
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('Connecté avec succès à MySQL via Prisma 7 Driver Adapter');
    } catch (error) {
      this.logger.error('Échec de connexion à MySQL', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Déconnexion de MySQL effectuée');
  }
}
