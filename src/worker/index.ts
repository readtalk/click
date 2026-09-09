import { issuer } from "@openauthjs/openauth";
import { CloudflareStorage } from "@openauthjs/openauth/storage/cloudflare";
import { PasswordProvider } from "@openauthjs/openauth/provider/password";
import { PasswordUI } from "@openauthjs/openauth/ui/password";
import { createSubjects } from "@openauthjs/openauth/subject";
import { createClient } from "@openauthjs/openauth/client";
import { object, string } from "valibot";

type Env = { AUTH_KV: KVNamespace; AUTH_DB: D1Database; }

export const subjects = createSubjects({
  user: object({ id: string() }),
});

const getAuthHandler = (env: Env) => issuer({
  storage: CloudflareStorage({ namespace: env.AUTH_KV }),
  subjects,
  providers: {
    password: PasswordProvider(PasswordUI({
      sendCode: async (email, code) => console.log(`[AUTH] ${email} -> ${code}`),
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
    const client = createClient({
      clientID: "vite",
      issuer: url.origin
    });

    // 1. Route OA standalone
    if (
      url.pathname.startsWith("/authorize") ||
      url.pathname.startsWith("/callback") ||
      url.pathname.startsWith("/.well-known") ||
      url.pathname.startsWith("/password") ||
      url.pathname.startsWith("/api/auth")
    ) {
      return getAuthHandler(env).fetch(request, env, ctx);
    }

    // 2. Route exchange code -> set cookie (ini = api/callback/route.ts di Next.js)
    if (url.pathname === "/api/callback") {
      const code = url.searchParams.get("code");
      const exchanged = await client.exchange(code!, `${url.origin}/api/callback`);
      const headers = new Headers();
      headers.append("Set-Cookie", `access_token=${exchanged.tokens.access}; HttpOnly; Path=/; Max-Age=2592000`);
      headers.append("Set-Cookie", `refresh_token=${exchanged.tokens.refresh}; HttpOnly; Path=/; Max-Age=2592000`);
      headers.set("Location", "/");
      return new Response(null, { status: 302, headers });
    }

    // 3. Route verify (ini = actions.ts -> auth() di Next.js)
    if (url.pathname === "/api/me") {
      const cookie = request.headers.get("Cookie") || "";
      const access = cookie.split(";").find(c => c.trim().startsWith("access_token="))?.split("=")[1];
      if (!access) return new Response(JSON.stringify({ user: null }), { status: 401 });
      try {
        const verified = await client.verify(subjects, access);
        return Response.json({ user: verified.subject.properties });
      } catch {
        return new Response(JSON.stringify({ user: null }), { status: 401 });
      }
    }

    return new Response(null, { status: 404 });
  }
} satisfies ExportedHandler<Env>;
