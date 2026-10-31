import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import { GameDataProvider } from "./context/GameDataContext.jsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <GameDataProvider>
          <App />
        </GameDataProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
