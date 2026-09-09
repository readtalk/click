import { useEffect, useState } from "react";

export default function App() {
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);

  useEffect(() => {
    // tangkep ?user_id & ?email dari redirect OpenAuth (kayak dashboard.ts lo)
    const q = new URLSearchParams(window.location.search);
    const uid = q.get("user_id");
    const email = q.get("email");

    if (uid && email) {
      localStorage.setItem("user_id", uid);
      localStorage.setItem("email", email);
      window.history.replaceState({}, "", "/profile"); // bersihin url
    }

    const savedId = localStorage.getItem("user_id");
    const savedEmail = localStorage.getItem("email");
    if (savedId && savedEmail) setUser({ id: savedId, email: savedEmail });
  }, []);

  const login = () => {
    const redirect = window.location.origin + "/profile";
    window.location.href = `/authorize?client_id=your-client-id&redirect_uri=${encodeURIComponent(redirect)}&response_type=code`;
  };

  const logout = () => {
    localStorage.removeItem("user_id");
    localStorage.removeItem("email");
    window.location.href = "/";
  };

  // BELUM LOGIN
  if (!user) {
    return (
      <div style={{ maxWidth: 600, margin: "40px auto", textAlign: "center", fontFamily: "system-ui" }}>
        <h1 style={{ color: "#ff0000" }}>READTalk Messenger</h1>
        <button onClick={login} style={{ background: "#ff0000", color: "white", border: 0, padding: "12px 24px", borderRadius: 8, cursor: "pointer" }}>
          Login with Email
        </button>
      </div>
    );
  }

  // UDAH LOGIN - sama kayak dashboard.ts lo
  return (
    <div style={{ maxWidth: 600, margin: "40px auto", padding: 20, fontFamily: "system-ui" }}>
      <div style={{ background: "white", padding: 30, borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
        <h4>Form @username?</h4>
        <div><b>Key ID:</b> {user.id}</div>
        <div><b>Email:</b> {user.email}</div>
        <button onClick={logout} style={{ background: "#ff0000", color: "white", border: 0, padding: "10px 24px", borderRadius: 8, marginTop: 20, cursor: "pointer" }}>
          Logout
        </button>
      </div>
    </div>
  );
}
