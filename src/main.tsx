import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

window.setTimeout(() => {
  try {
    sessionStorage.removeItem("gradeup-chunk-reload");
  } catch {
    /* ignore */
  }
}, 10000);

window.addEventListener("vite:preloadError", () => {
  try {
    if (sessionStorage.getItem("gradeup-chunk-reload") !== "1") {
      sessionStorage.setItem("gradeup-chunk-reload", "1");
      window.location.reload();
    }
  } catch {
    /* ignore */
  }
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
