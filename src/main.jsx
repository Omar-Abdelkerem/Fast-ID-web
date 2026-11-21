import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import "./i18n";
import App from "./App";
import { USE_MOCKS } from "@/lib/env";

async function start() {
  // mocks are loaded only in development with VITE_USE_MOCKS=true, so they never reach a production build
  if (USE_MOCKS) {
    const { startMocks } = await import("./mocks/browser");
    await startMocks();
  }
  ReactDOM.createRoot(document.getElementById("root")).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

start();
