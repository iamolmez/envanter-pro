import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

// PWA registration
import { registerSW } from "virtual:pwa-register";

// Service worker'ı kaydet (güncelleme varsa bildir)
const updateSW = registerSW({
  onNeedRefresh() {
    if (confirm("Uygulama güncellemesi mevcut. Şimdi güncellensin mi?")) {
      updateSW(true);
    }
  },
  onOfflineReady() {
    console.log("Uygulama çevrimdışı kullanıma hazır");
  },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
