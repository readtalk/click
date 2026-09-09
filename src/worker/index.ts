import { Hono } from "hono";

type Bindings = {
  AUTH_DB: D1Database
  AUTH_KV: KVNamespace
}

const app = new Hono<{ Bindings: Bindings }>();

app.get("/api/", (c) => c.json({ name: "OpenAuth" }));

app.get("/api/test", async (c) => {
  // test D1 lu yang to-trust
  const result = await c.env.AUTH_DB.prepare("SELECT count(*) as total FROM users").first();
  return c.json({ ok: true, db: "to-trust", total: result });
});

export default app;
