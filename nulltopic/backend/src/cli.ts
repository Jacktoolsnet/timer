import { migrate, cleanup, pool } from "./db.js";
import { randomUUID } from "node:crypto";
import argon2 from "argon2";
try {
  const command = process.argv[2];
  if (command === "migrate") await migrate();
  else if (command === "cleanup") {
    const reference = new Date();
    console.log(
      JSON.stringify({
        event: "cleanup_start",
        reference: reference.toISOString(),
      }),
    );
    const result = await cleanup(process.argv.includes("--dry-run"), reference);
    console.log(JSON.stringify({ event: "cleanup_end", ...result }));
  } else if (command === "bootstrap") {
    const handle = process.env.BOOTSTRAP_HANDLE,
      password = process.env.BOOTSTRAP_PASSWORD;
    if (
      !handle ||
      !/^[a-z0-9_]{3,32}$/.test(handle) ||
      !password ||
      password.length < 12
    )
      throw Error(
        "Set BOOTSTRAP_HANDLE (3–32 lowercase letters/digits/underscores) and BOOTSTRAP_PASSWORD (at least 12 characters)",
      );
    const table = process.argv.includes("--admin") ? "admins" : "operators";
    await pool.query(
      `INSERT INTO ${table}(id,handle,password) VALUES($1,$2,$3)`,
      [randomUUID(), handle, await argon2.hash(password)],
    );
    console.log("Account created");
  } else throw Error("Expected migrate, cleanup or bootstrap");
} catch (e) {
  console.error(e instanceof Error ? e.message : "Command failed");
  process.exitCode = 1;
} finally {
  await pool.end();
}
