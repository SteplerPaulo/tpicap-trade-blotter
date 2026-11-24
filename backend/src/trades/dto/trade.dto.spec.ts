import "reflect-metadata";
import { validationExceptionFactory } from "../../common/validation/validation-exception.factory";

import { BadRequestException, ValidationPipe } from "@nestjs/common";

import {
  CreateTradeDto,
  UpdateTradeDto,
  CancelTradeDto,
  Side,
} from "./trade.dto";

const validTrade = {
  symbol: "AAPL",
  side: Side.BUY,
  quantity: 100,
  price: 123.45,
  trader: "JSMITH",
  book: "EQUITIES_US",
  counterparty: "Citi",
};

describe("Trade DTO validation", () => {
  const pipe = new ValidationPipe({
    exceptionFactory: validationExceptionFactory,
    validationError: { target: false, value: false },
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: {
      enableImplicitConversion: false,
    },
  });

  const validateCreate = (input: object) =>
    pipe.transform(input, {
      type: "body",
      metatype: CreateTradeDto,
    });

  const validateUpdate = (input: object) =>
    pipe.transform(input, {
      type: "body",
      metatype: UpdateTradeDto,
    });

  const validateCancel = (input: object) =>
    pipe.transform(input, {
      type: "body",
      metatype: CancelTradeDto,
    });

  it("returns structured field errors", async () => {
    await expect(
      validateCreate({ ...validTrade, quantity: 0, symbol: "@" }),
    ).rejects.toMatchObject({
      response: {
        statusCode: 400,
        code: "VALIDATION_ERROR",
        fieldErrors: { quantity: expect.any(Array), symbol: expect.any(Array) },
      },
    });
  });

  describe("Optional trade date", () => {
    const tradeDate = "2026-11-21T01:00:00Z";
    it("accepts an omitted date on creation", async () => {
      await expect(validateCreate(validTrade)).resolves.toMatchObject(
        validTrade,
      );
    });
    it("accepts an omitted date on amendment", async () => {
      await expect(
        validateUpdate({ version: 1, quantity: 200 }),
      ).resolves.toMatchObject({ version: 1, quantity: 200 });
    });
    it("accepts valid dates on creation and amendment", async () => {
      await expect(
        validateCreate({ ...validTrade, tradeDate }),
      ).resolves.toMatchObject({ tradeDate });
      await expect(
        validateUpdate({ version: 1, tradeDate }),
      ).resolves.toMatchObject({ tradeDate });
    });
    it.each([null, "", "not-a-date", 123])(
      "rejects invalid dates: %s",
      async (value) => {
        await expect(
          validateCreate({ ...validTrade, tradeDate: value }),
        ).rejects.toBeInstanceOf(BadRequestException);
        await expect(
          validateUpdate({ version: 1, tradeDate: value }),
        ).rejects.toBeInstanceOf(BadRequestException);
      },
    );
  });

  describe("CreateTradeDto", () => {
    it("accepts a valid trade", async () => {
      await expect(validateCreate(validTrade)).resolves.toMatchObject(
        validTrade,
      );
    });

    it("normalizes text fields", async () => {
      const result = await validateCreate({
        ...validTrade,
        symbol: " aapl ",
        trader: " JSMITH ",
        book: " EQUITIES_US ",
        counterparty: " Citi ",
      });

      expect(result).toMatchObject(validTrade);
    });

    it.each([
      ["symbol", ""],
      ["symbol", "   "],
      ["symbol", "AAPL@"],
      ["symbol", "A".repeat(17)],
      ["side", "HOLD"],
      ["quantity", 0],
      ["quantity", -1],
      ["quantity", 10.5],
      ["quantity", "100"],
      ["quantity", 1_000_000_001],
      ["price", 0],
      ["price", -1],
      ["price", 0.00001],
      ["price", 123.45678],
      ["price", "123.45"],
      ["price", 1_000_000_001],
      ["trader", ""],
      ["trader", "J"],
      ["trader", "J SMITH"],
      ["book", ""],
      ["book", "   "],
      ["book", "A".repeat(65)],
      ["counterparty", ""],
      ["counterparty", "   "],
      ["counterparty", "A".repeat(101)],
    ])("rejects invalid %s: %s", async (field, value) => {
      await expect(
        validateCreate({
          ...validTrade,
          [field]: value,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it.each([0.0001, 123.4567, 1_000_000_000])(
      "accepts valid price: %s",
      async (price) => {
        await expect(
          validateCreate({ ...validTrade, price }),
        ).resolves.toMatchObject({ price });
      },
    );

    it.each([1, 1_000_000_000])(
      "accepts valid quantity: %s",
      async (quantity) => {
        await expect(
          validateCreate({ ...validTrade, quantity }),
        ).resolves.toMatchObject({ quantity });
      },
    );

    it.each(Object.keys(validTrade))(
      "rejects missing field: %s",
      async (field) => {
        const input = { ...validTrade } as Partial<typeof validTrade>;

        delete input[field as keyof typeof validTrade];

        await expect(validateCreate(input)).rejects.toBeInstanceOf(
          BadRequestException,
        );
      },
    );

    it("rejects unexpected properties", async () => {
      await expect(
        validateCreate({
          ...validTrade,
          status: "ACTIVE",
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("rejects an empty payload", async () => {
      await expect(validateCreate({})).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });
  });

  describe("UpdateTradeDto", () => {
    it("accepts a partial amendment", async () => {
      await expect(
        validateUpdate({
          quantity: 200,
          version: 1,
        }),
      ).resolves.toMatchObject({
        quantity: 200,
        version: 1,
      });
    });

    it("normalizes amendment fields", async () => {
      await expect(
        validateUpdate({
          symbol: " msft ",
          counterparty: " Citi ",
          version: 1,
        }),
      ).resolves.toMatchObject({
        symbol: "MSFT",
        counterparty: "Citi",
        version: 1,
      });
    });

    it.each(Object.keys(validTrade))(
      "rejects explicit null for %s",
      async (field) => {
        await expect(
          validateUpdate({
            [field]: null,
            version: 1,
          }),
        ).rejects.toBeInstanceOf(BadRequestException);
      },
    );

    it.each([0, -1, 1.5, "1", null, undefined])(
      "rejects invalid version: %s",
      async (version) => {
        await expect(
          validateUpdate({
            quantity: 200,
            version,
          }),
        ).rejects.toBeInstanceOf(BadRequestException);
      },
    );

    it("rejects invalid amendment quantity", async () => {
      await expect(
        validateUpdate({
          quantity: -100,
          version: 1,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("rejects direct status amendments", async () => {
      await expect(
        validateUpdate({
          status: "CANCELLED",
          version: 1,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe("CancelTradeDto", () => {
    it("accepts a valid version", async () => {
      await expect(validateCancel({ version: 1 })).resolves.toMatchObject({
        version: 1,
      });
    });

    it.each([0, -1, 1.5, "1", null, undefined])(
      "rejects invalid version: %s",
      async (version) => {
        await expect(validateCancel({ version })).rejects.toBeInstanceOf(
          BadRequestException,
        );
      },
    );

    it("rejects unexpected properties", async () => {
      await expect(
        validateCancel({
          version: 1,
          quantity: 100,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});
