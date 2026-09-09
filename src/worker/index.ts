import { Hono } from "hono";
type Env = { AUTH_DB: D1Database, AUTH_KV: KVNamespace }
const app = new Hono<{ Bindings: Env }>();

app.post("/api/login", async (c) => {
  const { email, password } = await c.req.json()
  const user = await c.env.AUTH_DB.prepare("SELECT * FROM users WHERE email = ?").bind(email).first()
  // cek password di sini
  return c.json({ ok: true, user })
})

export default app;
