import "dotenv/config";

import app from "./app";
import { prisma } from "./config/prisma";

const port = Number(process.env.PORT ?? 3000);

async function main(): Promise<void> {
  await prisma.$connect();

  const server = app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
  });

  const shutdown = (): void => {
    server.close(() => {
      void prisma.$disconnect().finally(() => {
        process.exit(0);
      });
    });
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch(async (error: unknown) => {
  console.error("Failed to start server:", error);
  await prisma.$disconnect();
  process.exitCode = 1;
});