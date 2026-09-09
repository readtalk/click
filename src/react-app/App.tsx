import { createClient } from "@openauthjs/openauth/client"

const authClient = createClient({
  clientID: "vite-app",
  issuer: "http://localhost:5173/auth" // dev, prod jadi /auth domain lo
})

function App() {
  return <button onClick={() => authClient.authorize(`${location.origin}/auth/callback`, "code")}>
    Login
  </button>
}
