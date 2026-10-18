import { Module } from '@nestjs/common';
import { BnplController } from './bnpl.controller';
import { BnplService } from './bnpl.service';
import { BnplCronService } from './bnpl-cron.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [BnplController],
  providers: [BnplService, BnplCronService],
  exports: [BnplService, BnplCronService],
})
export class BnplModule {}
