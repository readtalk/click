import { issuer } from "@openauthjs/openauth"
import { CloudflareStorage } from "@openauthjs/openauth/storage/cloudflare"
import { subjects } from "../../subjects.ts"
import { PasswordProvider } from "@openauthjs/openauth/provider/password"
import { PasswordUI } from "@openauthjs/openauth/ui/password"

export default {
  async fetch(request: Request, env: any, ctx: ExecutionContext) {
    // 1. CORS buat localhost:3001 & react
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Authorization, Content-Type",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
        }
      })
    }

    const url = new URL(request.url)

    // 2. API test yang dipanggil App.tsx -> / 
    if (url.pathname === "/" && request.headers.get("Authorization")) {
      const auth = issuer({
        storage: CloudflareStorage({ namespace: env.AUTH_KV }),
        subjects,
        providers: {
          password: PasswordProvider(
            PasswordUI({ sendCode: async (email, code) => console.log(email, code) })
          )
        },
        success: async (c, v: any) => c.subject("user", { id: v.email })
      })
      // verify token manual
      const token = request.headers.get("Authorization")!.replace("Bearer ", "")
      // @ts-ignore
      const verified = await auth.client.verify?.(subjects, token) 
      return new Response(verified ? "ok" : "unauthorized", {
        status: verified ? 200 : 401,
        headers: { "Access-Control-Allow-Origin": "*" }
      })
    }

    // 3. OpenAuth issuer utama
    return issuer({
      storage: CloudflareStorage({
        namespace: env.AUTH_KV
      }),
      subjects,
      allow: async () => true,
      providers: {
        password: PasswordProvider(
          PasswordUI({
            sendCode: async (email, code) => {
              console.log(email, code)
            }
          })
        )
      },
      success: async (ctx, value: any) => {
        return ctx.subject("user", {
          id: value.email
        })
      }
    }).fetch(request, env, ctx)
  }
}
