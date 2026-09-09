import { issuer } from "@openauthjs/openauth";
import { CloudflareStorage } from "@openauthjs/openauth/storage/cloudflare";
import { PasswordProvider } from "@openauthjs/openauth/provider/password";
import { PasswordUI } from "@openauthjs/openauth/ui/password";
import { createSubjects } from "@openauthjs/openauth/subject";
import { object, string } from "valibot";

type Env = { AUTH_KV: KVNamespace; AUTH_DB: D1Database; }

const subjects = createSubjects({
  user: object({ id: string(), email: string() }), // tambah email biar kebawa di token
});

const authHandler = (env: Env) => issuer({
  storage: CloudflareStorage({ namespace: env.AUTH_KV }),
  subjects,
  providers: {
    password: PasswordProvider(PasswordUI({
      sendCode: async (email, code) => console.log(`[AUTH] ${email} -> ${code}`),
      copy: { input_code: "Code (cek wrangler tail)" }
    }))
  },
  theme: {
    title: "ReadTalk Auth", primary: "#FF0000",
    favicon: "https://raw.githubusercontent.com/readtalk/auth/refs/heads/main/public/favicon.ico",
    logo: { dark: "https://raw.githubusercontent.com/readtalk/auth/refs/heads/main/public/logo.svg", light: "https://raw.githubusercontent.com/readtalk/auth/refs/heads/main/public/logo.svg" },
  },
  success: async (ctx, value) => {
    const r = await env.AUTH_DB.prepare(
      `INSERT INTO user (email) VALUES (?) ON CONFLICT(email) DO UPDATE SET email=email RETURNING id`
    ).bind(value.email).first<{id: string}>();
    // TETEP ctx.subject BIAR LOLOS - tapi bawa email juga
    return ctx.subject("user", { id: r!.id, email: value.email });
  },
});

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // SEJOLI MODERN: /api/me buat App.tsx
    if (url.pathname === "/api/me") {
      const cookie = request.headers.get("Cookie") || "";
      // ambil token dari cookie session OpenAuth, decode payload
      try {
        const match = cookie.match(/auth_token=([^;]+)/) || cookie.match(/session=([^;]+)/);
        if (match) {
          const payload = JSON.parse(atob(match[1].split('.')[1]));
          return Response.json({ id: payload.properties?.id || payload.sub, email: payload.properties?.email });
        }
      } catch {}
      // fallback: kalo gak ada cookie, cek?code= (flow baru)
      const code = url.searchParams.get("code");
      if (code) return Response.json({ id: "from-code", email: "" });

      return Response.json({ error: "no session" }, { status: 401 });
    }

    if (url.pathname === "/") {
      url.pathname = "/authorize";
      url.searchParams.set("redirect_uri", url.origin + "/dashboard");
      url.searchParams.set("client_id", "your-client-id");
      url.searchParams.set("response_type", "code");
      return Response.redirect(url.toString());
    }
    if (url.pathname === "/logout") {
      return new Response(null, { status: 302, headers: { Location: "/", "Set-Cookie": "session=; Max-Age=0; path=/" } });
    }
    if (url.pathname.startsWith("/authorize") || url.pathname.startsWith("/callback") || url.pathname.startsWith("/.well-known") || url.pathname.startsWith("/password")) {
      return authHandler(env).fetch(request, env, ctx);
    }
    return new Response(null, { status: 404 }); // biar App.tsx render
  }
} satisfies ExportedHandler<Env>;
