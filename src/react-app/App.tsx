import { useEffect, useState } from "react";

export default function App() {
  const [user, setUser] = useState<{id: string, email: string} | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // kalo ada?code=, bersihin dulu (OpenAuth udah set cookie)
    const params = new URLSearchParams(window.location.search);
    if (params.get("code")) {
      window.history.replaceState({}, "", "/dashboard");
    }
    // fetch sejoli modern
    fetch("/api/me", { credentials: "include" })
     .then(r => r.json())
     .then(d => {
        if (d.id) {
          localStorage.setItem("user_id", d.id);
          localStorage.setItem("email", d.email);
          setUser(d);
        }
      })
     .finally(() => setLoading(false));
  }, []);

  const logout = () => {
    localStorage.clear();
    window.location.href = "/logout";
  };

  if (loading) return <div style={{textAlign:"center", marginTop:40}}>Loading...</div>;
  if (!user) return <div style={{textAlign:"center", marginTop:40}}><a href="/">Login</a></div>;

  return (
    <div style={{maxWidth:600, margin:"40px auto"}}>
      <div style={{background:"white", padding:30, borderRadius:12}}>
        <h4>Form @username?</h4>
        <div><b>Key ID:</b> {user.id}</div>
        <div><b>Email:</b> {user.email}</div>
        <button onClick={logout} style={{background:"#ff0000", color:"white", border:0, padding:"10px 24px", borderRadius:8, marginTop:20}}>Logout</button>
      </div>
    </div>
  );
}
