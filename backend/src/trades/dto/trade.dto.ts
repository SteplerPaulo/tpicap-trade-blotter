import { Transform, Type } from "class-transformer";
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  ValidateIf,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from "class-validator";
import { PartialType } from "@nestjs/mapped-types";

export enum Side {
  BUY = "BUY",
  SELL = "SELL",
}

export enum Status {
  ACTIVE = "ACTIVE",
  CANCELLED = "CANCELLED",
}

const MAX_QUANTITY = 1_000_000_000;
const MAX_PRICE = 1_000_000_000;
const MIN_PRICE = 0.0001;

export class CreateTradeDto {
  @Transform(({ value }) =>
    typeof value === "string" ? value.trim().toUpperCase() : value,
  )
  @IsString()
  @Matches(/^[A-Z0-9.]{1,16}$/, {
    message: "Enter a valid ticker (e.g. AAPL)",
  })
  symbol!: string;

  @IsEnum(Side)
  side!: Side;

  @IsInt()
  @Min(1)
  @Max(MAX_QUANTITY)
  quantity!: number;

  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(MIN_PRICE)
  @Max(MAX_PRICE)
  price!: number;

  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @Matches(/^[A-Za-z0-9_.-]{2,64}$/, {
    message:
      "Trader must contain 2–64 letters, digits, underscores, periods or hyphens",
  })
  trader!: string;

  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @IsNotEmpty({ message: "Book is required" })
  @MaxLength(64)
  book!: string;

  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @IsNotEmpty({ message: "Counterparty is required" })
  @MaxLength(100)
  counterparty!: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsDateString()
  tradeDate?: string;
}

export class UpdateTradeDto extends PartialType(CreateTradeDto, {
  skipNullProperties: false,
}) {
  @IsInt()
  @Min(1)
  version!: number;
}

export class ListTradesDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(Side)
  side?: Side;

  @IsOptional()
  @IsEnum(Status)
  status?: Status;

  @IsOptional()
  @IsString()
  symbol?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize: number = 25;

  @IsOptional()
  @IsString()
  sortBy: string = "tradeDate";

  @IsOptional()
  @IsString()
  sortDir: string = "desc";
}

export class CancelTradeDto {
  @IsInt()
  @Min(1)
  version!: number;
}
