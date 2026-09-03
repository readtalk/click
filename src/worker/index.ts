import { Hono } from "hono";
import { issuer } from "@openauthjs/openauth";
import {
  CloudflareStorage,
  type CloudflareStorageOptions,
} from "@openauthjs/openauth/storage/cloudflare";
import { PasswordProvider } from "@openauthjs/openauth/provider/password";
import { PasswordUI } from "@openauthjs/openauth/ui/password";
import { createSubjects } from "@openauthjs/openauth/subject";
import { object, string } from "valibot";

// Subjects (harus sama dengan yang dipakai client)
const subjects = createSubjects({
  user: object({
    id: string(),
  }),
});

const app = new Hono<{ Bindings: Env }>();

// ======================
// 1. API Biasa
// ======================
app.get("/api/", (c) => {
  return c.json({ name: "Cloudflare" });
});

// Contoh API protected (nanti bisa dicek token)
app.get("/api/me", async (c) => {
  return c.json({ message: "Protected route example" });
});

// ======================
// 2. OpenAuth Issuer
// ======================
app.all("*", async (c) => {
  const authApp = issuer({
    storage: CloudflareStorage({
      namespace: c.env.AUTH_STORAGE as CloudflareStorageOptions["namespace"],
    }),
    subjects,
    providers: {
      password: PasswordProvider(
        PasswordUI({
          sendCode: async (email, code) => {
            // Ganti dengan pengiriman email sungguhan (Resend, dll)
            console.log(`Sending code ${code} to ${email}`);
          },
          copy: {
            input_code: "Code (check Worker logs)",
          },
        }),
      ),
    },
    theme: {
      title: "Authentication",
      primary: "#FF0000",
      favicon: "https://workers.cloudflare.com/favicon.ico",
      logo: {
        dark: "https://imagedelivery.net/wSMYJvS3Xw-n339CbDyDIA/db1e5c92-d3a6-4ea9-3e72-155844211f00/public",
        light:
          "https://imagedelivery.net/wSMYJvS3Xw-n339CbDyDIA/fa5a3023-7da9-466b-98a7-4ce01ee6c700/public",
      },
    },
    success: async (ctx, value) => {
      return ctx.subject("user", {
        id: await getOrCreateUser(c.env, value.email),
      });
    },
  });

  return authApp.fetch(c.req.raw, c.env, c.executionCtx);
});

export default app;

// ======================
// Helper: Get or Create User
// ======================
async function getOrCreateUser(env: Env, email: string): Promise<string> {
  const result = await env.AUTH_DB.prepare(
    `
    INSERT INTO user (email)
    VALUES (?)
    ON CONFLICT (email) DO UPDATE SET email = email
    RETURNING id;
    `,
  )
    .bind(email)
    .first<{ id: string }>();

  if (!result) {
    throw new Error(`Unable to process user: ${email}`);
  }

  console.log(`Found or created user ${result.id} with email ${email}`);
  return result.id;
}
