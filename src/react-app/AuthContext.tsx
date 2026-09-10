import { useRef, useState, ReactNode, useEffect, useContext, createContext } from "react"
import { createClient } from "@openauthjs/openauth/client"
import { subjects } from "../../subjects.js"

const client = createClient({
  clientID: "react",
  issuer: "https://click.readtalk.workers.dev",
})

interface AuthContextType {
  userId?: string
  loaded: boolean
  loggedIn: boolean
  logout: () => void
  login: () => Promise<void>
  getToken: () => Promise<string | undefined>
}

const AuthContext = createContext({} as AuthContextType)

export function AuthProvider({ children }: { children: ReactNode }) {
  const initializing = useRef(true)
  const [loaded, setLoaded] = useState(false)
  const [loggedIn, setLoggedIn] = useState(false)
  const token = useRef<string | undefined>(undefined)
  const [userId, setUserId] = useState<string | undefined>()

  useEffect(() => {
    const hash = new URLSearchParams(location.search) // FIX 1: jangan slice(1)
    const code = hash.get("code")
    const state = hash.get("state")
    if (!initializing.current) return
    initializing.current = false
    if (code && state) { callback(code, state); return }
    auth()
  }, [])

  async function auth() {
    const t = await refreshTokens()
    if (t) await user(t) // FIX 2: kirim token
    setLoaded(true)
  }

  async function refreshTokens() {
    const refresh = localStorage.getItem("refresh")
    if (!refresh) return
    const next = await client.refresh(refresh, { access: token.current })
    if (next.err || !next.tokens) return
    localStorage.setItem("refresh", next.tokens.refresh)
    token.current = next.tokens.access
    return next.tokens.access
  }

  async function getToken() {
    const t = await refreshTokens()
    if (t) return t
    return token.current
  }

  async function login() {
    const { challenge, url } = await client.authorize(location.origin, "code", { pkce: true })
    sessionStorage.setItem("challenge", JSON.stringify(challenge))
    location.href = url
  }

  async function callback(code: string, state: string) {
    const challenge = JSON.parse(sessionStorage.getItem("challenge")!)
    if (state === challenge.state && challenge.verifier) {
      const exchanged = await client.exchange(code, location.origin, challenge.verifier)
      if (!exchanged.err) {
        token.current = exchanged.tokens?.access
        localStorage.setItem("refresh", exchanged.tokens.refresh)
      }
    }
    window.location.replace("/")
  }

  async function user(access?: string) {
    const t = access || token.current
    if (!t) return
    const verified = await client.verify(subjects, t) // FIX 3: verify lokal, bukan fetch
    if (!verified.err) {
      setUserId(verified.subject.properties.id)
      setLoggedIn(true)
    }
  }

  function logout() {
    localStorage.removeItem("refresh")
    token.current = undefined
    window.location.replace("/")
  }

  return (
    <AuthContext.Provider value={{ login, logout, userId, loaded, loggedIn, getToken }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
