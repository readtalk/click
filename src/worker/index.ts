import { Hono } from "hono"
import { issuer } from "@openauthjs/openauth"
import { CloudflareStorage } from "@openauthjs/openauth/storage/cloudflare"
import { PasswordProvider } from "@openauthjs/openauth/provider/password"
import { PasswordUI } from "@openauthjs/openauth/ui/password"
import { createSubjects } from "@openauthjs/openauth/subject"
import { object, string } from "valibot"

type Env = { AUTH_KV: KVNamespace; AUTH_DB: D1Database }
const subjects = createSubjects({ user: object({ id: string() }) })

const app = new Hono<{ Bindings: Env }>()

// SEMUA route auth taro di sini - ini yang bikin Password UI muncul
app.all("/authorize/*", async (c) => {
  const auth = issuer({
    storage: CloudflareStorage({ namespace: c.env.AUTH_KV }),
    subjects,
    providers: { password: PasswordProvider(PasswordUI({ sendCode: async (e, code) => console.log(code, e) })) },
    success: async (ctx, v) => {
      const r = await c.env.AUTH_DB.prepare(`INSERT INTO user (email) VALUES (?) ON CONFLICT(email) DO UPDATE SET email=email RETURNING id`).bind(v.email).first<{id:string}>()
      return ctx.subject("user", { id: r!.id })
    },
  })
  return auth.fetch(c.req.raw, c.env, c.executionContext)
})

app.all("/password/*", async (c) => {
  const auth = issuer({
    storage: CloudflareStorage({ namespace: c.env.AUTH_KV }),
    subjects,
    providers: { password: PasswordProvider(PasswordUI({ sendCode: async (e, code) => console.log(code, e) })) },
    success: async (ctx, v) => {
      const r = await c.env.AUTH_DB.prepare(`INSERT INTO user (email) VALUES (?) ON CONFLICT(email) DO UPDATE SET email=email RETURNING id`).bind(v.email).first<{id:string}>()
      return ctx.subject("user", { id: r!.id })
    },
  })
  return auth.fetch(c.req.raw, c.env, c.executionContext)
})

app.all("/.well-known/*", async (c) => {
  const auth = issuer({
    storage: CloudflareStorage({ namespace: c.env.AUTH_KV }),
    subjects,
    providers: { password: PasswordProvider(PasswordUI({ sendCode: async (e, code) => console.log(code, e) })) },
    success: async (ctx, v) => {
      const r = await c.env.AUTH_DB.prepare(`INSERT INTO user (email) VALUES (?) ON CONFLICT(email) DO UPDATE SET email=email RETURNING id`).bind(v.email).first<{id:string}>()
      return ctx.subject("user", { id: r!.id })
    },
  })
  return auth.fetch(c.req.raw, c.env, c.executionContext)
})

export default app
