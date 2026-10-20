import { Injectable, Optional } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

@Injectable()
export class AppService {
  constructor(@Optional() private readonly prisma?: PrismaService) {}

  getHello(): string {
    return 'Hello World!';
  }

  async getHealth() {
    let databaseStatus = 'connected';
    let databaseLatencyMs: number | null = null;

    if (this.prisma && typeof (this.prisma as any).$queryRaw === 'function') {
      const start = Date.now();
      try {
        await (this.prisma as any).$queryRaw`SELECT 1`;
        databaseLatencyMs = Date.now() - start;
      } catch {
        databaseStatus = 'error';
      }
    }

    const memoryUsage = process.memoryUsage();

    return {
      status: 'ok',
      service: 'openboutik-api',
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      database: {
        status: databaseStatus,
        latencyMs: databaseLatencyMs,
      },
      memory: {
        rssMb: Math.round((memoryUsage.rss / 1024 / 1024) * 100) / 100,
        heapUsedMb: Math.round((memoryUsage.heapUsed / 1024 / 1024) * 100) / 100,
        heapTotalMb: Math.round((memoryUsage.heapTotal / 1024 / 1024) * 100) / 100,
      },
    };
  }
}
