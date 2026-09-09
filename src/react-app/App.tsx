import { useEffect, useState } from "react";

export default function App() {
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const user_id = params.get("user_id");
    const email = params.get("email");

    if (user_id && email) {
      localStorage.setItem("user_id", user_id);
      localStorage.setItem("email", email);
      // bersihin url kayak dashboard.ts lo
      window.history.replaceState({}, "", window.location.pathname);
    }

    const savedId = localStorage.getItem("user_id");
    const savedEmail = localStorage.getItem("email");

    if (savedId && savedEmail) {
      setUser({ id: savedId, email: savedEmail });
    }
    setLoading(false);
  }, []);

  const logout = () => {
    localStorage.removeItem("user_id");
    localStorage.removeItem("email");
    window.location.href = "/";
  };

  if (loading) return <div style={{ textAlign: "center", marginTop: 40 }}>Loading...</div>;

  if (!user) {
    return <div style={{ textAlign: "center", marginTop: 40 }}>No session found. Please login to /</div>;
  }

  return (
    <div style={{ maxWidth: 600, margin: "40px auto", padding: "0 20px", fontFamily: "system-ui" }}>
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
