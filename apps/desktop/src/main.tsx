import React from "react"
import ReactDOM from "react-dom/client"

import { initTauriPlatform } from "./platform"
import App from "./App"

initTauriPlatform()

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
