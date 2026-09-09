import { issuer } from "@openauthjs/openauth";
import {
  CloudflareStorage,
  type CloudflareStorageOptions,
} from "@openauthjs/openauth/storage/cloudflare";
import { PasswordProvider } from "@openauthjs/openauth/provider/password";
import { PasswordUI } from "@openauthjs/openauth/ui/password";
import { createSubjects } from "@openauthjs/openauth/subject";
import { object, string } from "valibot";

const subjects = createSubjects({
  user: object({ id: string() }),
});

export default {
  fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);

    // DULU: if ("/dashboard") return DashboardHTML() -> SEKARANG HAPUS, BIAR App.tsx YANG HANDLE
    // jadi kalo /dashboard, return 404 biar assets (React) yang serve App.tsx

    if (url.pathname === "/logout") {
      return new Response(null, {
        status: 302,
        headers: {
          Location: "/",
          "Set-Cookie": "session=; Max-Age=0; path=/",
        },
      });
    }

    if (url.pathname === "/") {
      url.searchParams.set("redirect_uri", url.origin + "/dashboard");
      url.searchParams.set("client_id", "your-client-id");
      url.searchParams.set("response_type", "code");
      url.pathname = "/authorize";
      return Response.redirect(url.toString());
    }

    // DULU: if ("/callback") return Response.json() -> HAPUS, BIAR ISSUER YANG HANDLE
    // kalo gak dihapus, nanti jadi "redirect json" lagi

    return issuer({
      storage: CloudflareStorage({
        namespace: env.AUTH_KV as CloudflareStorageOptions["namespace"],
      }),
      subjects,
      providers: {
        password: PasswordProvider(
          PasswordUI({
            sendCode: async (email, code) => {
              console.log(`Sending code ${code} to ${email}`);
            },
            copy: {
              input_code: "Code (check Worker logs)",
            },
          })
        ),
      },
      theme: {
        title: "READTalk Messenger",
        primary: "#FF0000",
        favicon:
          "https://raw.githubusercontent.com/readtalk/global/refs/heads/main/public/favicon.ico",
        logo: {
          dark: "https://raw.githubusercontent.com/readtalk/global/refs/heads/main/public/brand.png",
          light: "https://raw.githubusercontent.com/readtalk/global/refs/heads/main/public/brand.png",
        },
      },
      // INI KAWINNYA SAMA App.tsx LO:
      // App.tsx nunggu ?user_id & ?email, jadi success harus redirect bawa itu
      success: async (ctx, value) => {
        const userId = await getOrCreateUser(env, value.email);
        return Response.redirect(
          `${url.origin}/dashboard?user_id=${userId}&email=${encodeURIComponent(
            value.email
          )}`,
          302
        );
      },
    }).fetch(request, env, ctx);
  },
} satisfies ExportedHandler<Env>;

async function getOrCreateUser(env: Env, email: string): Promise<string> {
  const result = await env.AUTH_DB.prepare(
    `INSERT INTO user (email) VALUES (?) ON CONFLICT (email) DO UPDATE SET email = email RETURNING id;`
  )
    .bind(email)
    .first<{ id: string }>();

  if (!result) {
    throw new Error(`Unable to process user: ${email}`);
  }
  return result.id;
}
