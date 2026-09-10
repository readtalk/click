import { useState } from "react"
import { useAuth } from "./AuthContext"

function App() {
  const auth = useAuth()
  const [status, setStatus] = useState("")

  async function callApi() {    
    const token = await auth.getToken()
    setStatus(token ? `success token ada, user: ${auth.userId}` : "error no token")
  }

  return !auth.loaded ? <div>Loading...</div> : (
    <div>
      {auth.loggedIn ? (
        <div>
          <p>Logged in {auth.userId && <>as {auth.userId}</>}</p>
          {status && <p>API call: {status}</p>}
          <button onClick={callApi}>Call API</button>
          <button onClick={auth.logout}>Logout</button>
        </div>
      ) : (
        <button onClick={auth.login}>Login with OAuth</button>
      )}
    </div>
  )
}
export default App
