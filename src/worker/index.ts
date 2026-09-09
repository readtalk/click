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
    password: PasswordProvider(
      PasswordUI({
        sendCode: async (email, code) => {
          console.log(`[AUTH] ${email} -> ${code}`);
        },
        copy: {
          input_code: "Code (cek wrangler tail)",
        },
      })
    ),
  },
  theme: {
    title: "ReadTalk Auth",
    primary: "#FF0000",
    favicon: "https://raw.githubusercontent.com/readtalk/auth/refs/heads/main/public/favicon.ico",
    logo: {
      dark: "https://raw.githubusercontent.com/readtalk/auth/refs/heads/main/public/logo.svg",
      light: "https://raw.githubusercontent.com/readtalk/auth/refs/heads/main/public/logo.svg",
    },
  },
  success: async (ctx, value) => {
    const result = await env.AUTH_DB.prepare(
      `INSERT INTO user (email) VALUES (?) ON CONFLICT(email) DO UPDATE SET email=email RETURNING id`
    ).bind(value.email).first<{ id: string }>();

    if (!result) {
      throw new Error(`Failed to create user: ${value.email}`);
    }

    // KAWIN SAMA App.tsx: redirect bawa ?user_id & ?email biar App.tsx bisa tangkep
    return new Response(null, {
      status: 302,
      headers: {
        Location: `/dashboard?user_id=${result.id}&email=${encodeURIComponent(value.email)}`,
      },
    });
  },
});

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/logout") {
      return new Response(null, {
        status: 302,
        headers: {
          Location: "/",
          "Set-Cookie": "session=; Max-Age=0; path=/",
        },
      });
    }

    if (
      url.pathname.startsWith("/authorize") ||
      url.pathname.startsWith("/callback") ||
      url.pathname.startsWith("/.well-known") ||
      url.pathname.startsWith("/password") ||
      url.pathname.startsWith("/api/auth")
    ) {
      return authHandler(env).fetch(request, env, ctx);
    }

    // Biarin Cloudflare serve React (App.tsx)
    return new Response(null, { status: 404 });
  },
} satisfies ExportedHandler<Env>;
