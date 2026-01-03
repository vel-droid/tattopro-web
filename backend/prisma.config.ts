// prisma.config.ts
import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  // путь к schema.prisma относительно этой папки (backend)
  schema: "prisma/schema.prisma",
  migrations: {
    // куда Prisma будет складывать миграции
    path: "prisma/migrations",
  },
  datasource: {
    // использует твой DATABASE_URL из .env
    url: env("DATABASE_URL"),
  },
});
