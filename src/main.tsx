import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

const rootElement = document.getElementById("root");
if (!rootElement) {
    throw new Error("无法找到根元素");
}

const root = createRoot(rootElement);
root.render(
    <StrictMode>
        <App />
    </StrictMode>,
);
