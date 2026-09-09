import { useState, useEffect } from "react";
import reactLogo from "./assets/react.svg";
import viteLogo from "/vite.svg";
import cloudflareLogo from "./assets/Cloudflare_Logo.svg";
import honoLogo from "./assets/hono.svg";
import "./App.css";

function App() {
  const [count, setCount] = useState(0);
  const [callbackData, setCallbackData] = useState<any>(null);

  // kalo abis login dari /callback, tangkep paramnya
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.pathname === "/callback") {
      setCallbackData(Object.fromEntries(url.searchParams.entries()));
    }
  }, []);

  const login = () => {
    const url = new URL(window.location.origin + "/authorize");
    url.searchParams.set("client_id", "your-client-id");
    url.searchParams.set("redirect_uri", window.location.origin + "/callback");
    url.searchParams.set("response_type", "code");
    window.location.href = url.toString();
  };

  if (callbackData) {
    return (
      <div style={{ padding: 40 }}>
        <h1>OAuth flow complete! 🎉</h1>
        <pre style={{ background: "#111", color: "#0f0", padding: 20, textAlign: "left" }}>
          {JSON.stringify(callbackData, null, 2)}
        </pre>
        <button onClick={() => (window.location.href = "/")}>Back to Home</button>
      </div>
    );
  }

  return (
    <>
      <div>
        <a href="https://vite.dev" target="_blank"><img src={viteLogo} className="logo" alt="Vite logo" /></a>
        <a href="https://react.dev" target="_blank"><img src={reactLogo} className="logo react" alt="React logo" /></a>
        <a href="https://hono.dev/" target="_blank"><img src={honoLogo} className="logo cloudflare" alt="Hono logo" /></a>
        <a href="https://workers.cloudflare.com/" target="_blank"><img src={cloudflareLogo} className="logo cloudflare" alt="Cloudflare logo" /></a>
      </div>
      <h1>Vite + React + Hono + Cloudflare + OpenAuth</h1>
      
      <div className="card">
        <button onClick={login} style={{ background: "#FF0000", color: "white", fontWeight: "bold" }}>
          Login with OpenAuth
        </button>
        <p>Code bakal muncul di `wrangler tail` / Dashboard Logs</p>
      </div>

      <div className="card">
        <button onClick={() => setCount((c) => c + 1)}>count is {count}</button>
      </div>

      <p className="read-the-docs">Worker: click.readtalk.workers.dev - D1: to-trust</p>
    </>
  );
}

export default App;
