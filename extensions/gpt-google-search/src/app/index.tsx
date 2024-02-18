import React, { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

let isAppInDevMode;

try {
  isAppInDevMode = process.env.ENV === "development";
} catch (e) {
  isAppInDevMode = false;
} finally {
  isAppInDevMode = false;
}

const ROOT_ID = isAppInDevMode ? "root" : "gpt-google-search-root";

const createRootElement = () => {
  const rootElement = document.createElement("div");
  rootElement.id = ROOT_ID;

  document.body.appendChild(rootElement);
};

if (!isAppInDevMode) {
  createRootElement();
}

const root = ReactDOM.createRoot(
  document.getElementById(ROOT_ID) as HTMLElement,
);

root.render(
  <StrictMode>
    <App />
  </StrictMode>,
);
