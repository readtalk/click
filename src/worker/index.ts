import { issuer } from "@openauthjs/openauth";
import { CloudflareStorage } from "@openauthjs/openauth/storage/cloudflare";
import { PasswordProvider } from "@openauthjs/openauth/provider/password";
import { PasswordUI } from "@openauthjs/openauth/ui/password";
import { createSubjects } from "@openauthjs/openauth/subject";
import { object, string } from "valibot";

type Env = { AUTH_KV: KVNamespace; AUTH_DB: D1Database }

const subjects = createSubjects({
  user: object({ id: string() }),
});

export default {
  fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);
    
    // HAPUS yang "/" redirect, sisa-in callback demo aja
    if (url.pathname === "/callback") {
      return Response.json({ 
        message: "OAuth flow complete!",
        params: Object.fromEntries(url.searchParams.entries())
      });
    }

    return issuer({
      storage: CloudflareStorage({ namespace: env.AUTH_KV }),
      subjects,
      providers: {
        password: PasswordProvider(PasswordUI({
          sendCode: async (email, code) => {
            console.log(`Sending code ${code} to ${email}`);
          },
          copy: { input_code: "Code (check Worker logs)" },
        })),
      },
      theme: {
        title: "myAuth",
        primary: "#FFFFFF",
        favicon: "https://workers.cloudflare.com//favicon.ico",
        logo: {
          dark: "https://imagedelivery.net/wSMYJvS3Xw-n339CbDyDIA/db1e5c92-d3a6-4ea9-3e72-155844211f00/public",
          light: "https://imagedelivery.net/wSMYJvS3Xw-n339CbDyDIA/fa5a3023-7da9-466b-98a7-4ce01ee6c700/public",
        },
      },
      success: async (ctx, value) => {
        const result = await env.AUTH_DB.prepare(
          `INSERT INTO user (email) VALUES (?) ON CONFLICT (email) DO UPDATE SET email = email RETURNING id;`
        ).bind(value.email).first<{ id: string }>();
        return ctx.subject("user", { id: result!.id });
      },
    }).fetch(request, env, ctx);
  },
} satisfies ExportedHandler<Env>;
