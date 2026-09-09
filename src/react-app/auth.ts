import { createClient } from "@openauthjs/openauth/client";
import { createSubjects } from "@openauthjs/openauth/subject";
import { object, string } from "valibot";

export const subjects = createSubjects({
  user: object({ id: string() }),
});

export const client = createClient({
  clientID: "vite",
  issuer: window.location.origin,
});
