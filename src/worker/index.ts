import { issuer } from "@openauthjs/openauth"
import { CloudflareStorage } from "@openauthjs/openauth/storage/cloudflare"
import { CodeProvider } from "@openauthjs/openauth/provider/code"
import { createClient } from "@openauthjs/openauth/client"
import { subjects } from "../../subjects"

type Env = { AUTH_KV: KVNamespace; AUTH_DB: D1Database }

const authIssuer = (env: Env) => issuer({
  storage: CloudflareStorage({ namespace: env.AUTH_KV }),
  subjects,
  providers: {
    code: CodeProvider({
      sendCode: async (claims, code) => console.log(claims.email, code)
    })
  },
  success: async (ctx, value) => {
    return ctx.subject("user", { id: value.claims.email })
  }
})

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url)

    // 1. semua /auth/* -> issuer (ini ctx.subject di-approve di sini)
    if (url.pathname.startsWith("/auth")) {
      return authIssuer(env).fetch(request, env, ctx)
    }

    // 2. semua /api/* atau / -> API worker (yang lo paste tadi tapi tanpa service binding)
    const client = createClient({
      clientID: "click",
      issuer: url.origin + "/auth",
    })

    if (url.pathname === "/callback") {
      const code = url.searchParams.get("code")!
      const exchanged = await client.exchange(code, url.origin + "/callback")
      if (exchanged.err) return new Response(exchanged.err.message, { status: 400 })
      const res = new Response(null, { status: 302, headers: { Location: "/" } })
      res.headers.append("Set-Cookie", `access_token=${exchanged.tokens!.access}; HttpOnly; Path=/; SameSite=Lax`)
      res.headers.append("Set-Cookie", `refresh_token=${exchanged.tokens!.refresh}; HttpOnly; Path=/; SameSite=Lax`)
      return res
    }

    if (url.pathname === "/authorize") {
      const { url: authUrl } = await client.authorize(url.origin + "/callback", "code")
      return Response.redirect(authUrl, 302)
    }

    if (url.pathname === "/api/me") {
      const cookies = new URLSearchParams(request.headers.get("cookie")?.replaceAll("; ", "&"))
      const verified = await client.verify(subjects, cookies.get("access_token") || "", {
        refresh: cookies.get("refresh_token") || undefined,
      })
      if (verified.err) return new Response("unauthorized", { status: 401 })
      return Response.json(verified.subject.properties) // <-- ini id dari ctx.subject
    }

    // biarin assets dist/client ke-handle otomatis sama wrangler
    return new Response("Not found", { status: 404 })
  }
} satisfies ExportedHandler<Env>
