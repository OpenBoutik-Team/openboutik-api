import { Module } from '@nestjs/common';
import { NegotiationsController } from './negotiations.controller';
import { NegotiationsService } from './negotiations.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [NegotiationsController],
  providers: [NegotiationsService],
  exports: [NegotiationsService],
})
export class NegotiationsModule {}
