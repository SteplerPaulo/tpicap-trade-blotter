import "reflect-metadata";
import { validationExceptionFactory } from "./common/validation/validation-exception.factory";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";

import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.enableShutdownHooks();
  app.disable("x-powered-by");

  app.setGlobalPrefix("api");

  const allowedOrigins = (
    process.env.FRONTEND_ORIGIN ?? "http://localhost:5173"
  )
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.enableCors({
    origin: allowedOrigins,
    credentials: false,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      exceptionFactory: validationExceptionFactory,
      validationError: { target: false, value: false },
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: false,
      },
    }),
  );

  const port = Number(process.env.PORT ?? 3001);

  await app.listen(port, "0.0.0.0");

  console.log(`API listening on ${await app.getUrl()}/api`);
}

void bootstrap().catch((error: unknown) => {
  console.error("API startup failed", error);
  process.exit(1);
});
