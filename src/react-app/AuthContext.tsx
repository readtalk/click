import { createContext, useContext, useEffect, useState } from "react"
import { createClient } from "@openauthjs/openauth/client"
import { createSubjects } from "@openauthjs/openauth/subject"
import { object, string } from "valibot"

const subjects = createSubjects({
  user: object({ id: string() })
})

const client = createClient({
  clientID: "vite",
  issuer: "http://click.readtalk.workers.dev/password/authorize", // issuer lo
})

type Auth = {
  loaded: boolean
  loggedIn: boolean
  userId: string | null
  getToken: () => Promise<string | null>
  login: () => Promise<void>
  logout: () => void
}

const Ctx = createContext<Auth>(null as any)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loaded, setLoaded] = useState(false)
  const [tokens, setTokens] = useState<{ access: string; refresh: string } | null>(null)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    const init = async () => {
      // 1. cek callback ?code=
      const url = new URL(window.location.href)
      const code = url.searchParams.get("code")
      if (code) {
        const exchanged = await client.exchange(code, `${window.location.origin}/`)
        localStorage.setItem("tokens", JSON.stringify(exchanged.tokens))
        window.history.replaceState({}, "", "/")
        setTokens(exchanged.tokens)
      } else {
        const saved = localStorage.getItem("tokens")
        if (saved) setTokens(JSON.parse(saved))
      }
      setLoaded(true)
    }
    init()
  }, [])

  useEffect(() => {
    if (!tokens?.access) return
    client.verify(subjects, tokens.access).then(v => {
      setUserId(v.subject.properties.id) // ini ctx.subject dari index.ts
    }).catch(() => setUserId(null))
  }, [tokens])

  const login = async () => {
    const { url } = await client.authorize(`${window.location.origin}/`, "code")
    window.location.href = url
  }

  const logout = () => {
    localStorage.removeItem("tokens")
    setTokens(null)
    setUserId(null)
  }

  const getToken = async () => tokens?.access || null

  return (
    <Ctx.Provider value={{ loaded, loggedIn: !!tokens, userId, getToken, login, logout }}>
      {children}
    </Ctx.Provider>
  )
}

export const useAuth = () => useContext(Ctx)
