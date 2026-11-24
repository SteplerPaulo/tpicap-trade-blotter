# Database

PostgreSQL 16 is configured in the root `docker-compose.yml`. Prisma schema, reproducible migration SQL and a deterministic, idempotent 350-trade synthetic data seeder are located in `../backend/prisma`.

To inspect locally:

```bash
docker compose exec db psql -U trades -d trades -c 'SELECT "tradeId", symbol, side, quantity, price, status FROM "Trade" LIMIT 10;'
```

The database uses integer quantities, DECIMAL(18,4) prices, UTC timestamps, optimistic versions and separate audit records. Backups, identity management and hardening are out of scope for this assessment.
