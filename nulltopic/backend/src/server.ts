import { createApp } from "./app.js";
import { pool } from "./db.js";
const app = await createApp();
await app.listen({ host: "127.0.0.1", port: Number(process.env.PORT || 4322) });
console.log("NullTopic backend ready");
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, async () => {
    await app.close();
    await pool.end();
    process.exit(0);
  });
