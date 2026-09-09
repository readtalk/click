import { issuer } from "@openauthjs/openauth";
import { CloudflareStorage, type CloudflareStorageOptions } from "@openauthjs/openauth/storage/cloudflare";
import { PasswordProvider } from "@openauthjs/openauth/provider/password";
import { PasswordUI } from "@openauthjs/openauth/ui/password";
import { createSubjects } from "@openauthjs/openauth/subject";
import { object, string } from "valibot";

const subjects = createSubjects({ user: object({ id: string() }) });

export default {
  fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);

    // biarin /dashboard di-handle React, jangan return HTML di sini
    if (url.pathname === "/logout") {
      return new Response(null, {
        status: 302,
        headers: { Location: "/", "Set-Cookie": "session=; Max-Age=0; path=/" },
      });
    }

    if (url.pathname === "/") {
      url.searchParams.set("redirect_uri", url.origin + "/dashboard");
      url.searchParams.set("client_id", "your-client-id");
      url.searchParams.set("response_type", "code");
      url.pathname = "/authorize";
      return Response.redirect(url.toString());
    }

    // JANGAN handle /dashboard dan /callback di sini — biar React + issuer yang urus

    return issuer({
      storage: CloudflareStorage({ namespace: env.AUTH_KV as CloudflareStorageOptions["namespace"] }),
      subjects,
      providers: {
        password: PasswordProvider(PasswordUI({
          sendCode: async (email, code) => console.log(`Code ${code} to ${email}`),
          copy: { input_code: "Code (check Worker logs)" },
        })),
      },
      theme: {
        title: "READTalk Messenger",
        primary: "#FF0000",
        favicon: "https://raw.githubusercontent.com/readtalk/global/refs/heads/main/public/favicon.ico",
        logo: {
          dark: "https://raw.githubusercontent.com/readtalk/global/refs/heads/main/public/brand.png",
          light: "https://raw.githubusercontent.com/readtalk/global/refs/heads/main/public/brand.png",
        },
      },
      success: async (ctx, value) => {
        const userId = await getOrCreateUser(env, value.email);
        // redirect dengan query biar App.tsx bisa tangkep kayak dashboard.ts lo
        return ctx.subject("user", { id: userId });
      },
    }).fetch(request, env, ctx);
  },
} satisfies ExportedHandler<Env>;

async function getOrCreateUser(env: Env, email: string) {
  const r = await env.AUTH_DB.prepare(
    `INSERT INTO user (email) VALUES (?) ON CONFLICT(email) DO UPDATE SET email=email RETURNING id`
  ).bind(email).first<{ id: string }>();
  return r!.id;
}
