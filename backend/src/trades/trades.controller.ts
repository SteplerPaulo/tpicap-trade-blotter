import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  ParseUUIDPipe,
} from "@nestjs/common";
import { TradesService } from "./trades.service";
import {
  CancelTradeDto,
  CreateTradeDto,
  ListTradesDto,
  UpdateTradeDto,
} from "./dto/trade.dto";
@Controller("trades")
export class TradesController {
  constructor(private readonly trades: TradesService) {}

  @Get() list(@Query() query: ListTradesDto) {
    return this.trades.list(query);
  }

  @Get("summary") summary() {
    return this.trades.summary();
  }

  @Get(":id/audit") audit(@Param("id", ParseUUIDPipe) id: string) {
    return this.trades.audit(id);
  }

  @Get(":id") one(@Param("id", ParseUUIDPipe) id: string) {
    return this.trades.one(id);
  }

  @Post() create(@Body() body: CreateTradeDto) {
    return this.trades.create(body);
  }

  @Patch(":id") update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() body: UpdateTradeDto,
  ) {
    return this.trades.update(id, body);
  }

  @Post(":id/cancel") cancel(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() body: CancelTradeDto,
  ) {
    return this.trades.cancel(id, body.version);
  }
}
