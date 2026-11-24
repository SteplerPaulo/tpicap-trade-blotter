import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";
import { TradesService, present } from "./trades.service";
import { ListTradesDto, CreateTradeDto, Side } from "./dto/trade.dto";
import { Prisma, TradeStatus } from "@prisma/client";

const trade = {
  id: "07a910a0-70ba-40db-8bd2-42d48c8e0001",
  tradeId: "TRD-100001",
  symbol: "AAPL",
  side: "BUY",
  quantity: 100,
  price: { toString: () => "123.4500", valueOf: () => 123.45 },
  trader: "JSMITH",
  book: "EQUITIES_US",
  counterparty: "Citi",
  tradeDate: new Date("2026-11-21T01:00:00Z"),
  createdAt: new Date("2026-11-21T01:00:00Z"),
  updatedAt: new Date("2026-11-21T01:00:00Z"),
  status: TradeStatus.ACTIVE,
  version: 1,
} as any;

describe("TradesService business rules", () => {
  const events = { publish: jest.fn() };
  let db: any;
  let service: TradesService;
  beforeEach(() => {
    jest.clearAllMocks();
    db = {
      trade: {
        findUnique: jest.fn(),
        updateMany: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        create: jest.fn(),
      },
      tradeAudit: { create: jest.fn() },
    };
    db.$transaction = jest.fn(async (cb: any) => cb(db));
    service = new TradesService(db, events as any);
  });
  it("lists trades with stable ordering and a consistent snapshot", async () => {
    db.trade.findMany = jest.fn().mockResolvedValue([trade]);
    db.trade.count = jest.fn().mockResolvedValue(51);
    db.$transaction.mockImplementation((queries: Promise<unknown>[]) =>
      Promise.all(queries),
    );
    const result = await service.list(
      Object.assign(new ListTradesDto(), {
        page: 2,
        pageSize: 25,
        sortBy: "price",
        sortDir: "asc",
      }),
    );
    expect(db.trade.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ price: "asc" }, { id: "asc" }],
        skip: 25,
        take: 25,
      }),
    );
    expect(db.$transaction).toHaveBeenCalledWith(expect.any(Array), {
      isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
    });
    expect(result).toMatchObject({
      total: 51,
      page: 2,
      pageSize: 25,
      pages: 3,
    });
  });
  it("summarizes active positions using one consistent snapshot and deterministic ordering", async () => {
    db.trade.count = jest
      .fn()
      .mockResolvedValueOnce(4)
      .mockResolvedValueOnce(2);
    db.trade.groupBy = jest.fn().mockResolvedValue([
      { symbol: "MSFT", side: "SELL", _sum: { quantity: 100 } },
      { symbol: "AAPL", side: "BUY", _sum: { quantity: 150 } },
      { symbol: "AAPL", side: "SELL", _sum: { quantity: 50 } },
      { symbol: "IBM", side: "BUY", _sum: { quantity: 200 } },
    ]);
    db.$transaction.mockImplementation((queries: Promise<unknown>[]) =>
      Promise.all(queries),
    );
    expect(await service.summary()).toEqual({
      activeCount: 4,
      cancelledCount: 2,
      totalCount: 6,
      positions: [
        { symbol: "IBM", netQuantity: 200, grossQuantity: 200 },
        { symbol: "AAPL", netQuantity: 100, grossQuantity: 200 },
        { symbol: "MSFT", netQuantity: -100, grossQuantity: 100 },
      ],
    });
    expect(db.$transaction).toHaveBeenCalledWith(expect.any(Array), {
      isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
    });
    expect(db.trade.count).toHaveBeenNthCalledWith(1, {
      where: { status: "ACTIVE" },
    });
    expect(db.trade.count).toHaveBeenNthCalledWith(2, {
      where: { status: "CANCELLED" },
    });
    expect(db.trade.groupBy).toHaveBeenCalledWith({
      by: ["symbol", "side"],
      where: { status: "ACTIVE" },
      orderBy: [{ symbol: "asc" }, { side: "asc" }],
      _sum: { quantity: true },
    });
  });
  it("returns an empty summary when no trades exist", async () => {
    db.trade.count = jest.fn().mockResolvedValue(0);
    db.trade.groupBy = jest.fn().mockResolvedValue([]);
    db.$transaction.mockImplementation((queries: Promise<unknown>[]) =>
      Promise.all(queries),
    );
    expect(await service.summary()).toEqual({
      activeCount: 0,
      cancelledCount: 0,
      totalCount: 0,
      positions: [],
    });
  });
  it("serializes money and timestamps for the API", () => {
    expect(present(trade).price).toBe(123.45);
    expect(present(trade).tradeDate).toBe("2026-11-21T01:00:00.000Z");
  });
  it("rejects amendments to a cancelled trade", async () => {
    db.trade.findUnique.mockResolvedValue({
      ...trade,
      status: TradeStatus.CANCELLED,
    });
    await expect(
      service.update(trade.id, { version: 1, quantity: 200 }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(events.publish).not.toHaveBeenCalled();
  });
  it("rejects stale versions to prevent lost updates", async () => {
    db.trade.findUnique.mockResolvedValue({ ...trade, version: 2 });
    await expect(service.cancel(trade.id, 1)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });
  it("rejects cancelling a missing trade", async () => {
    db.trade.findUnique.mockResolvedValue(null);
    await expect(service.cancel(trade.id, 1)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
  it("rejects an empty amendment", async () => {
    await expect(
      service.update(trade.id, { version: 1 }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
  it("cancels with audit in one transaction and broadcasts afterwards", async () => {
    db.trade.findUnique.mockResolvedValue(trade);
    db.trade.updateMany.mockResolvedValue({ count: 1 });
    db.trade.findUniqueOrThrow.mockResolvedValue({
      ...trade,
      status: TradeStatus.CANCELLED,
      version: 2,
    });
    const result = await service.cancel(trade.id, 1);
    expect(result.status).toBe(TradeStatus.CANCELLED);
    expect(db.tradeAudit.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: "CANCELLED" }),
      }),
    );
    expect(events.publish).toHaveBeenCalledWith("cancelled", trade.id);
  });
  const input: CreateTradeDto = {
    symbol: "AAPL",
    side: Side.BUY,
    quantity: 100,
    price: 150.25,
    trader: "JSMITH",
    book: "EQUITIES_US",
    counterparty: "Citi",
  };
  it("creates a trade and records its audit before publishing", async () => {
    db.trade.create.mockResolvedValue(trade);
    db.$transaction.mockImplementation(async (cb: any) => {
      const result = await cb(db);
      expect(events.publish).not.toHaveBeenCalled();
      return result;
    });
    expect(await service.create(input)).toEqual(present(trade));
    expect(db.trade.create).toHaveBeenCalledWith({
      data: { ...input, tradeId: expect.stringMatching(/^TRD-/) },
    });
    expect(db.tradeAudit.create).toHaveBeenCalledWith({
      data: { tradeId: trade.id, action: "CREATED", after: present(trade) },
    });
    expect(events.publish).toHaveBeenCalledWith("created", trade.id);
  });
  it("amends using a conditional version update and records both snapshots", async () => {
    const amended = { ...trade, quantity: 200, version: 2 };
    db.trade.findUnique.mockResolvedValue(trade);
    db.trade.updateMany.mockResolvedValue({ count: 1 });
    db.trade.findUniqueOrThrow.mockResolvedValue(amended);
    expect(
      await service.update(trade.id, { version: 1, quantity: 200 }),
    ).toEqual(present(amended));
    expect(db.trade.updateMany).toHaveBeenCalledWith({
      where: { id: trade.id, version: 1, status: TradeStatus.ACTIVE },
      data: { quantity: 200, version: { increment: 1 } },
    });
    expect(db.tradeAudit.create).toHaveBeenCalledWith({
      data: {
        tradeId: trade.id,
        action: "AMENDED",
        before: present(trade),
        after: present(amended),
      },
    });
    expect(events.publish).toHaveBeenCalledWith("amended", trade.id);
  });
  it.each(["amend", "cancel"])(
    "rejects a concurrent %s without auditing or publishing",
    async (action) => {
      db.trade.findUnique.mockResolvedValue(trade);
      db.trade.updateMany.mockResolvedValue({ count: 0 });
      await expect(
        action === "amend"
          ? service.update(trade.id, { version: 1, quantity: 200 })
          : service.cancel(trade.id, 1),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(db.tradeAudit.create).not.toHaveBeenCalled();
      expect(events.publish).not.toHaveBeenCalled();
    },
  );
  it("does not publish when audit creation fails", async () => {
    db.trade.create.mockResolvedValue(trade);
    db.tradeAudit.create.mockRejectedValue(new Error("audit failure"));
    await expect(service.create(input)).rejects.toThrow("audit failure");
    expect(events.publish).not.toHaveBeenCalled();
  });
  it("does not publish when the transaction fails at commit", async () => {
    db.trade.create.mockResolvedValue(trade);
    db.$transaction.mockImplementation(async (cb: any) => {
      await cb(db);
      throw new Error("commit failure");
    });
    await expect(service.create(input)).rejects.toThrow("commit failure");
    expect(events.publish).not.toHaveBeenCalled();
  });
  it("rejects a missing amendment target", async () => {
    db.trade.findUnique.mockResolvedValue(null);
    await expect(
      service.update(trade.id, { version: 1, quantity: 200 }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(db.trade.updateMany).not.toHaveBeenCalled();
  });
  it("rejects repeated cancellation", async () => {
    db.trade.findUnique.mockResolvedValue({
      ...trade,
      status: TradeStatus.CANCELLED,
    });
    await expect(service.cancel(trade.id, 1)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(db.trade.updateMany).not.toHaveBeenCalled();
  });
  it("retrieves bounded audit history for an existing trade", async () => {
    db.trade.findUnique.mockResolvedValue(trade);
    db.tradeAudit.findMany = jest.fn().mockResolvedValue([]);
    expect(await service.audit(trade.id)).toEqual([]);
    expect(db.tradeAudit.findMany).toHaveBeenCalledWith({
      where: { tradeId: trade.id },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  });
  it("rejects audit retrieval for a missing trade", async () => {
    db.trade.findUnique.mockResolvedValue(null);
    db.tradeAudit.findMany = jest.fn();
    await expect(service.audit(trade.id)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(db.tradeAudit.findMany).not.toHaveBeenCalled();
  });
  it("applies combined filters and returns valid empty pagination", async () => {
    db.trade.findMany = jest.fn().mockResolvedValue([]);
    db.trade.count = jest.fn().mockResolvedValue(0);
    db.$transaction.mockImplementation((queries: Promise<unknown>[]) =>
      Promise.all(queries),
    );
    const result = await service.list(
      Object.assign(new ListTradesDto(), {
        search: " Citi ",
        symbol: "aapl",
        side: "BUY",
        status: "ACTIVE",
      }),
    );
    const where = {
      side: "BUY",
      status: "ACTIVE",
      symbol: { equals: "AAPL" },
      OR: ["symbol", "tradeId", "trader", "counterparty", "book"].map(
        (field) => ({ [field]: { contains: "Citi", mode: "insensitive" } }),
      ),
    };
    expect(db.trade.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where }),
    );
    expect(db.trade.count).toHaveBeenCalledWith({ where });
    expect(result).toEqual({
      data: [],
      total: 0,
      page: 1,
      pageSize: 25,
      pages: 1,
    });
  });
});
