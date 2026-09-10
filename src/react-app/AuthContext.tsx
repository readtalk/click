import { useRef, useState, ReactNode, useEffect, useContext, createContext } from "react"
import { createClient } from "@openauthjs/openauth/client"
import { subjects } from "../../subjects.js" // <- tambah ini

const ISSUER = "https://click.readtalk.workers.dev"
const client = createClient({ clientID: "react", issuer: ISSUER })

export function AuthProvider({ children }: { children: ReactNode }) {
  const initializing = useRef(true)
  const [loaded, setLoaded] = useState(false)
  const [loggedIn, setLoggedIn] = useState(false)
  const token = useRef<string | undefined>()
  const [userId, setUserId] = useState<string>()

  useEffect(() => {
    if (!initializing.current) return
    initializing.current = false
    const params = new URLSearchParams(location.search)
    const code = params.get("code")
    const state = params.get("state")
    if (code && state) { callback(code, state); return }
    auth()
  }, [])

  async function auth() {
    try {
      const t = await refreshTokens()
      if (t) await user(t)
    } finally { setLoaded(true) }
  }

  async function refreshTokens() {
    const refresh = localStorage.getItem("refresh")
    if (!refresh) return
    const next = await client.refresh(refresh, { access: token.current })
    if (next.err || !next.tokens) { localStorage.removeItem("refresh"); return }
    token.current = next.tokens.access
    localStorage.setItem("refresh", next.tokens.refresh)
    return next.tokens.access
  }

  async function getToken() {
    return (await refreshTokens()) || token.current
  }

  async function login() {
    const { challenge, url } = await client.authorize(location.origin, "code", { pkce: true })
    sessionStorage.setItem("challenge", JSON.stringify(challenge))
    location.href = url
  }

  async function callback(code: string, state: string) {
    const raw = sessionStorage.getItem("challenge")
    if (!raw) return
    const challenge = JSON.parse(raw)
    if (state !== challenge.state) return
    const exchanged = await client.exchange(code, location.origin, challenge.verifier)
    if (!exchanged.err && exchanged.tokens) {
      token.current = exchanged.tokens.access
      localStorage.setItem("refresh", exchanged.tokens.refresh)
    }
    window.location.replace("/")
  }

  async function user(access?: string) {
    const t = access || token.current
    if (!t) return
    try {
      // verify lokal, gak perlu fetch ke worker
      const verified = await client.verify(subjects, t)
      if (!verified.err) {
        setUserId(verified.subject.properties.id)
        setLoggedIn(true)
      }
    } catch {}
  }

  function logout() {
    localStorage.removeItem("refresh")
    token.current = undefined
    location.href = "/"
  }

  return <AuthContext.Provider value={{ login, logout, userId, loaded, loggedIn, getToken }}>{children}</AuthContext.Provider>
}
export function useAuth() { return useContext(AuthContext) }
