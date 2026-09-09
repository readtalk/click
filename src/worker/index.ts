import { issuer } from "@openauthjs/openauth";
import { CloudflareStorage } from "@openauthjs/openauth/storage/cloudflare";
import { PasswordProvider } from "@openauthjs/openauth/provider/password";
import { PasswordUI } from "@openauthjs/openauth/ui/password";
import { createSubjects } from "@openauthjs/openauth/subject";
import { object, string } from "valibot";

type Env = { AUTH_KV: KVNamespace; AUTH_DB: D1Database; }
const subjects = createSubjects({ user: object({ id: string() }) });

const authHandler = (env: Env, origin: string) => issuer({
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
    logo: {
      dark: "https://raw.githubusercontent.com/readtalk/auth/refs/heads/main/public/logo.svg",
      light: "https://raw.githubusercontent.com/readtalk/auth/refs/heads/main/public/logo.svg",
    },
  },
  success: async (ctx, value) => {
    const r = await env.AUTH_DB.prepare(
      `INSERT INTO user (email) VALUES (?) ON CONFLICT(email) DO UPDATE SET email=email RETURNING id`
    ).bind(value.email).first<{id: string}>();
    // KAWIN: kasih ?user_id & ?email biar App.tsx lo hidup
    return new Response(null, {
      status: 302,
      headers: { Location: `${origin}/dashboard?user_id=${r!.id}&email=${encodeURIComponent(value.email)}` }
    });
  },
});

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/" ) {
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
      return authHandler(env, url.origin).fetch(request, env, ctx);
    }
    return new Response(null, { status: 404 }); // biar React App.tsx yang handle /dashboard
  }
} satisfies ExportedHandler<Env>;
