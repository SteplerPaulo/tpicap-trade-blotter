import { Module } from "@nestjs/common";
import { TradesController } from "./trades.controller";
import { TradesService } from "./trades.service";
import { TradesGateway } from "../realtime/trades.gateway";
@Module({
  controllers: [TradesController],
  providers: [TradesService, TradesGateway],
})
export class TradesModule {}
