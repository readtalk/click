import { issuer } from "@openauthjs/openauth"
import { CloudflareStorage } from "@openauthjs/openauth/storage/cloudflare"
import { CodeProvider } from "@openauthjs/openauth/provider/code"
import { createClient } from "@openauthjs/openauth/client"
import { subjects } from "../../subjects"
import { Hono } from "hono"

type Env = { AUTH_KV: KVNamespace; AUTH_DB: D1Database }

const app = new Hono<{ Bindings: Env }>()

// 1. Mount ISSUER di /auth
const authApp = issuer({
  storage: CloudflareStorage({ namespace: (globalThis as any).AUTH_KV }),
  subjects,
  providers: {
    code: CodeProvider({ sendCode: async (c, code) => console.log(c.email, code) })
  },
  success: async (ctx, v) => ctx.subject("user", { id: v.claims.email })
})

// Hono biar bisa /auth/* dan /api/* barengan
app.all("/auth/*", (c) => authApp.fetch(c.req.raw, c.env, c.executionCtx))

// 2. Mount API di /api
app.get("/api/me", async (c) => {
  const client = createClient({ clientID: "react", issuer: new URL("/auth", c.req.url).toString() })
  const auth = c.req.header("Authorization")?.replace("Bearer ", "")
  if (!auth) return c.text("unauthorized", 401)
  
  const verified = await client.verify(subjects, auth)
  if (verified.err) return c.text("unauthorized", 401)
  
  return c.json(verified.subject.properties) // <- ini ctx.subject
})

export default app
