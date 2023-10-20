import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const root = document.getElementById("root");
if (!root) throw new Error("unable to find mount point!");

let app = React.createElement(App);
if (import.meta.env.DEV) app = React.createElement(React.StrictMode, null, app);

ReactDOM.createRoot(root).render(app);
