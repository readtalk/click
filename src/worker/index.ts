import { issuer } from "@openauthjs/openauth"
import { CloudflareStorage } from "@openauthjs/openauth/storage/cloudflare"
import { CodeProvider } from "@openauthjs/openauth/provider/code"
import { subjects } from "../../subjects"

export default issuer({
  storage: CloudflareStorage({ namespace: (globalThis as any).AUTH_KV }),
  subjects,
  providers: {
    code: CodeProvider({
      sendCode: async (c, code) => console.log(c.email, code)
    })
  },
  success: async (ctx, v) => {
    return ctx.subject("user", { id: v.claims.email }) // ini ctx.subject yang lo approve
  }
})
