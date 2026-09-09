import { Hono } from "hono"
import { createAuth } from "./auth"

type Env = {
  AUTH_DB: D1Database
  AUTH_KV: KVNamespace
}

const app = new Hono<{ Bindings: Env }>()

// 1. AUTH ROUTES - harus paling atas
app.all("/auth/*", async (c) => {
  const auth = createAuth(c.env)
  return auth.fetch(c.req.raw, c.env, c.executionCtx)
})

// 2. API lo
app.get("/api/me", async (c) => {
  // contoh cek session nanti disini
  return c.json({ ok: true })
})

export default app
