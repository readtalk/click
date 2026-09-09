//
import { issuer } from "@openauthjs/openauth";
import { CloudflareStorage } from "@openauthjs/openauth/storage/cloudflare";
import { PasswordProvider } from "@openauthjs/openauth/provider/password";
import { PasswordUI } from "@openauthjs/openauth/ui/password";
import { createSubjects } from "@openauthjs/openauth/subject";
import { object, string } from "valibot";

type Env = {
  AUTH_KV: KVNamespace;
  AUTH_DB: D1Database;
}

const subjects = createSubjects({
  user: object({ id: string() }),
});

const authHandler = (env: Env) => issuer({
  storage: CloudflareStorage({ namespace: env.AUTH_KV }),
  subjects,
  providers: {
    password: PasswordProvider(PasswordUI({
      sendCode: async (email, code) => {
        console.log(`[AUTH] ${email} -> ${code}`);
      },
      copy: { input_code: "Code (cek wrangler tail)" }
    })),
  },
  theme: {
    title: "Authentication",
    primary: "#FF0000",
    favicon: "https://raw.githubusercontent.com/readtalk/auth/refs/heads/main/public/favicon.ico",
    logo: {
      dark: "https://raw.githubusercontent.com/readtalk/auth/refs/heads/main/public/logo.svg",
      light: "https://raw.githubusercontent.com/readtalk/auth/refs/heads/main/public/logo.svg",
    },
  },
  success: async (ctx, value) => {
    const r = await env.AUTH_DB.prepare(
      `INSERT INTO user (email) VALUES (?) ON CONFLICT(email) DO UPDATE SET email=email RETURNING id`
    ).bind(value.email).first<{id: string}>();
    return ctx.subject("user", { id: r!.id });
  }
});

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    // cuma route auth yang di-handle worker
    if (url.pathname.startsWith("/authorize") || url.pathname.startsWith("/callback") || url.pathname.startsWith("/.well-known") || url.pathname.startsWith("/password") || url.pathname.startsWith("/api/auth")) {
      return authHandler(env).fetch(request, env, ctx);
    }
    // sisanya biarin Cloudflare yang serve dist/client (React)
    // kalo pake vite plugin, return 404 biar assets fallback yang handle
    return new Response(null, { status: 404 });
  }
} satisfies ExportedHandler<Env>;
