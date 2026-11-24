import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma, Trade, TradeStatus } from "@prisma/client";
import { randomUUID } from "crypto";
import { PrismaService } from "../prisma/prisma.service";
import { TradesGateway } from "../realtime/trades.gateway";
import { CreateTradeDto, ListTradesDto, UpdateTradeDto } from "./dto/trade.dto";

export function present(trade: Trade) {
  return {
    ...trade,
    price: Number(trade.price),
    tradeDate: trade.tradeDate.toISOString(),
    createdAt: trade.createdAt.toISOString(),
    updatedAt: trade.updatedAt.toISOString(),
  };
}

@Injectable()
export class TradesService {
  constructor(
    private readonly db: PrismaService,
    private readonly events: TradesGateway,
  ) {}

  async list(q: ListTradesDto) {
    const allowed = [
      "tradeDate",
      "symbol",
      "quantity",
      "price",
      "trader",
      "side",
      "status",
      "tradeId",
      "book",
    ];
    const sortBy = allowed.includes(q.sortBy) ? q.sortBy : "tradeDate";
    const sortDir: Prisma.SortOrder = q.sortDir === "asc" ? "asc" : "desc";
    const search = q.search?.trim().slice(0, 100);
    const where: Prisma.TradeWhereInput = {
      ...(q.side && { side: q.side }),
      ...(q.status && { status: q.status }),
      ...(q.symbol && { symbol: { equals: q.symbol.toUpperCase() } }),
      ...(search && {
        OR: [
          { symbol: { contains: search, mode: "insensitive" } },
          { tradeId: { contains: search, mode: "insensitive" } },
          { trader: { contains: search, mode: "insensitive" } },
          { counterparty: { contains: search, mode: "insensitive" } },
          { book: { contains: search, mode: "insensitive" } },
        ],
      }),
    };
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 25;
    const [rows, total] = await this.db.$transaction(
      [
        this.db.trade.findMany({
          where,
          orderBy: [{ [sortBy]: sortDir }, { id: "asc" }],
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        this.db.trade.count({ where }),
      ],
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
    return {
      data: rows.map(present),
      total,
      page,
      pageSize,
      pages: Math.max(1, Math.ceil(total / pageSize)),
    };
  }

  async one(id: string) {
    const trade = await this.db.trade.findUnique({ where: { id } });
    if (!trade) throw new NotFoundException("Trade not found");
    return present(trade);
  }

  async create(dto: CreateTradeDto) {
    // A UUID-derived public trade reference avoids allocating sequence numbers across nodes.
    const tradeId = `TRD-${randomUUID().slice(0, 12).toUpperCase()}`;
    const created = await this.db.$transaction(async (tx) => {
      const trade = await tx.trade.create({
        data: {
          tradeId,
          symbol: dto.symbol,
          side: dto.side,
          quantity: dto.quantity,
          price: dto.price,
          trader: dto.trader,
          book: dto.book,
          counterparty: dto.counterparty,
          ...(dto.tradeDate && { tradeDate: new Date(dto.tradeDate) }),
        },
      });
      await tx.tradeAudit.create({
        data: { tradeId: trade.id, action: "CREATED", after: present(trade) },
      });
      return trade;
    });
    this.events.publish("created", created.id);
    return present(created);
  }

  async update(id: string, dto: UpdateTradeDto) {
    const { version, ...changes } = dto;
    if (Object.keys(changes).length === 0)
      throw new BadRequestException("Provide at least one field to amend");
    const updated = await this.db.$transaction(async (tx) => {
      const current = await tx.trade.findUnique({ where: { id } });
      if (!current) throw new NotFoundException("Trade not found");
      if (current.status === TradeStatus.CANCELLED)
        throw new ConflictException("Cancelled trades cannot be amended");
      if (current.version !== version)
        throw new ConflictException(
          "This trade was modified elsewhere. Refresh and try again.",
        );
      const result = await tx.trade.updateMany({
        where: { id, version, status: TradeStatus.ACTIVE },
        data: {
          ...changes,
          ...(changes.tradeDate && { tradeDate: new Date(changes.tradeDate) }),
          version: { increment: 1 },
        },
      });
      if (result.count !== 1)
        throw new ConflictException("Trade changed concurrently");
      const trade = await tx.trade.findUniqueOrThrow({ where: { id } });
      await tx.tradeAudit.create({
        data: {
          tradeId: id,
          action: "AMENDED",
          before: present(current),
          after: present(trade),
        },
      });
      return trade;
    });
    this.events.publish("amended", id);
    return present(updated);
  }

  async cancel(id: string, version: number) {
    const cancelled = await this.db.$transaction(async (tx) => {
      const current = await tx.trade.findUnique({ where: { id } });
      if (!current) throw new NotFoundException("Trade not found");
      if (current.status === TradeStatus.CANCELLED)
        throw new ConflictException("Trade is already cancelled");
      if (current.version !== version)
        throw new ConflictException(
          "This trade was modified elsewhere. Refresh and try again.",
        );
      const result = await tx.trade.updateMany({
        where: { id, version, status: TradeStatus.ACTIVE },
        data: { status: TradeStatus.CANCELLED, version: { increment: 1 } },
      });
      if (result.count !== 1)
        throw new ConflictException("Trade changed concurrently");
      const trade = await tx.trade.findUniqueOrThrow({ where: { id } });
      await tx.tradeAudit.create({
        data: {
          tradeId: id,
          action: "CANCELLED",
          before: present(current),
          after: present(trade),
        },
      });
      return trade;
    });
    this.events.publish("cancelled", id);
    return present(cancelled);
  }

  async audit(id: string) {
    await this.one(id);
    return this.db.tradeAudit.findMany({
      where: { tradeId: id },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }

  async summary() {
    const [activeCount, cancelledCount, positions] = await this.db.$transaction(
      [
        this.db.trade.count({ where: { status: "ACTIVE" } }),
        this.db.trade.count({ where: { status: "CANCELLED" } }),
        this.db.trade.groupBy({
          by: ["symbol", "side"],
          where: {
            status: "ACTIVE",
          },
          orderBy: [{ symbol: "asc" }, { side: "asc" }],
          _sum: {
            quantity: true,
          },
        }),
      ],
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
    const combined = new Map<
      string,
      { symbol: string; netQuantity: number; grossQuantity: number }
    >();
    for (const row of positions) {
      const item = combined.get(row.symbol) ?? {
        symbol: row.symbol,
        netQuantity: 0,
        grossQuantity: 0,
      };
      const qty = row._sum?.quantity ?? 0;
      item.netQuantity += row.side === "BUY" ? qty : -qty;
      item.grossQuantity += qty;
      combined.set(row.symbol, item);
    }
    return {
      activeCount,
      cancelledCount,
      totalCount: activeCount + cancelledCount,
      positions: [...combined.values()]
        .sort(
          (a, b) =>
            Math.abs(b.netQuantity) - Math.abs(a.netQuantity) ||
            (a.symbol < b.symbol ? -1 : a.symbol > b.symbol ? 1 : 0),
        )
        .slice(0, 8),
    };
  }
}
