import { useEffect, useState } from "react";
import { client } from "./auth";

export default function App() {
  const [user, setUser] = useState<{id: string} | null>(null);

  useEffect(() => {
    fetch("/api/me").then(r => r.json()).then(d => setUser(d.user));
  }, []);

  const login = async () => {
    const { url } = await client.authorize(`${window.location.origin}/api/callback`, "code");
    window.location.href = url;
  };

  if (!user) return <button onClick={login}>Login</button>;
  return <div>Login as: {user.id} — from ctx.subject("user", { id })</div>;
}
