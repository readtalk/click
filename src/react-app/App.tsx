import { useState } from "react";
import { createClient } from "@openauthjs/openauth/client"
import "./App.css";

const authClient = createClient({
  clientID: "vite-app",
  issuer: "http://click.readtalk.workers.dev/auth"
})

function App() {
  return <button onClick={() => authClient.authorize(`${location.origin}/auth/callback`, "code")}>
    Login
  </button>
}
