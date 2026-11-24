import { Module } from "@nestjs/common";
import { PrismaModule } from "./prisma/prisma.module";
import { TradesModule } from "./trades/trades.module";

import { HealthController } from "./health/health.controller";

@Module({
  imports: [PrismaModule, TradesModule],
  controllers: [HealthController],
})
export class AppModule {}
