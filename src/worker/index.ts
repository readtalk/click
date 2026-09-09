import { issuer } from "@openauthjs/openauth";
import { CloudflareStorage } from "@openauthjs/openauth/storage/cloudflare";
import { PasswordProvider } from "@openauthjs/openauth/provider/password";
import { PasswordUI } from "@openauthjs/openauth/ui/password";
import { createSubjects } from "@openauthjs/openauth/subject";
import { object, string } from "valibot";

type Env = { AUTH_KV: KVNamespace; AUTH_DB: D1Database; }

const subjects = createSubjects({
  user: object({ id: string() }),
});

async function getOrCreateUser(env: Env, email: string): Promise<string> {
  const r = await env.AUTH_DB.prepare(
    `INSERT INTO user (email) VALUES (?) ON CONFLICT(email) DO UPDATE SET email=email RETURNING id`
  ).bind(email).first<{ id: string }>();
  if (!r) throw new Error(`Unable to process user: ${email}`);
  return r.id;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // 1. ROOT -> lempar ke login
    if (url.pathname === "/") {
      const redirect_uri = url.origin + "/dashboard";
      url.pathname = "/authorize";
      url.searchParams.set("client_id", "your-client-id");
      url.searchParams.set("redirect_uri", redirect_uri);
      url.searchParams.set("response_type", "code");
      return Response.redirect(url.toString(), 302);
    }

    // 2. LOGOUT
    if (url.pathname === "/logout") {
      return new Response(null, {
        status: 302,
        headers: {
          Location: "/",
          "Set-Cookie": "session=; Max-Age=0; path=/",
        },
      });
    }

    // 3. AUTH ROUTES
    if (
      url.pathname.startsWith("/authorize") ||
      url.pathname.startsWith("/callback") ||
      url.pathname.startsWith("/.well-known") ||
      url.pathname.startsWith("/password")
    ) {
      return issuer({
        storage: CloudflareStorage({ namespace: env.AUTH_KV }),
        subjects,
        providers: {
          password: PasswordProvider(
            PasswordUI({
              sendCode: async (email, code) => {
                console.log(`[AUTH] ${email} -> ${code}`);
              },
              copy: { input_code: "Code (cek wrangler tail)" },
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
          const userId = await getOrCreateUser(env, value.email);
          // INI KUNCI BIAR App.tsx TERBUKA: kasih ?user_id & ?email
          return Response.redirect(
            `${url.origin}/dashboard?user_id=${userId}&email=${encodeURIComponent(value.email)}`,
            302
          );
        },
      }).fetch(request, env, ctx);
    }

    // 4. SEMUA SISANYA TERMASUK /dashboard BIARIN REACT (App.tsx) YANG HANDLE
    // App.tsx lo yang nunggu ?user_id akan kebuka di sini
    return new Response(null, { status: 404 });
  },
} satisfies ExportedHandler<Env>;
