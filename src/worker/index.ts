import { issuer } from "@openauthjs/openauth"
import { CloudflareStorage } from "@openauthjs/openauth/storage/cloudflare"
import { CodeProvider } from "@openauthjs/openauth/provider/code"
import { createClient } from "@openauthjs/openauth/client"
import { subjects } from "../../subjects"

type Env = { AUTH_KV: KVNamespace; AUTH_DB: D1Database }

function makeIssuer(env: Env) {
  return issuer({
    storage: CloudflareStorage({ namespace: env.AUTH_KV }),
    subjects,
    providers: {
      code: CodeProvider({
        sendCode: async (c, code) => console.log(c.email, code)
      })
    },
    success: async (ctx, v) => ctx.subject("user", { id: v.claims.email })
  })
}

export default {
  async fetch(req: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(req.url)

    // /auth/* -> issuer
    if (url.pathname.startsWith("/auth")) {
      // strip /auth biar issuer ngira rootnya /auth
      return makeIssuer(env).fetch(req, env, ctx)
    }

    // /api/me -> API yang baca ctx.subject
    if (url.pathname === "/api/me") {
      const client = createClient({
        clientID: "react",
        issuer: url.origin + "/auth"
      })
      const token = req.headers.get("Authorization")?.replace("Bearer ", "")
      if (!token) return new Response("no token", { status: 401 })
      
      const verified = await client.verify(subjects, token)
      if (verified.err) return new Response("unauthorized: " + verified.err.message, { status: 401 })
      
      return Response.json(verified.subject.properties)
    }

    return new Response("Not found", { status: 404 })
  }
}
