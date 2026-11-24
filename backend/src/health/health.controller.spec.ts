import { ServiceUnavailableException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { HealthController } from "./health.controller";

describe("HealthController", () => {
  const query = jest.fn();
  const controller = new HealthController({
    $queryRaw: query,
  } as unknown as PrismaService);
  beforeEach(() => query.mockReset());
  it("reports readiness when the database responds", async () => {
    query.mockResolvedValue([{ "?column?": 1 }]);
    await expect(controller.readiness()).resolves.toEqual({
      status: "ok",
      database: "up",
    });
  });
  it("returns a service unavailable error when the database fails", async () => {
    query.mockRejectedValue(new Error("connection failed"));
    await expect(controller.readiness()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
