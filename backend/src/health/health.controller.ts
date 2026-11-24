import {
  Controller,
  Get,
  Header,
  ServiceUnavailableException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Controller("health")
export class HealthController {
  constructor(private readonly db: PrismaService) {}

  @Get()
  @Header("Cache-Control", "no-store")
  async readiness() {
    try {
      await this.db.$queryRaw`SELECT 1`;
      return { status: "ok", database: "up" };
    } catch {
      throw new ServiceUnavailableException({
        status: "unavailable",
        database: "down",
      });
    }
  }
}
