import { issuer } from "@openauthjs/openauth"
import { CodeProvider } from "@openauthjs/openauth/provider/code"
import { CloudflareStorage } from "@openauthjs/openauth/storage/cloudflare"
import { subjects } from "./subjects"

export const createAuth = (env: { AUTH_KV: KVNamespace }) => {
  return issuer({
    storage: CloudflareStorage({
      namespace: env.AUTH_KV
    }),
    subjects,
    providers: {
      code: CodeProvider({
        sendCode: async (email, code) => {
          // dev: liat di log wrangler
          // prod: ganti pake Resend / MailChannels
          console.log(`[AUTH] ${email} -> ${code}`)
        }
      })
    },
    // optional, biar callback url kebaca di prod
    allow: async () => true,
    async success(ctx, value) {
      return ctx.subject("user", {
        userID: value.email,
        email: value.email
      })
    }
  })
}
