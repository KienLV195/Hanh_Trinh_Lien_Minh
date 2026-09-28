import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app";
import "./styles.css";
import "./level-one.css";
import "./level-two-three.css";
import "./level-two-image-reveal.css";
import "./level-four-five.css";
import "./level-five-platformer.css";
import "./level-six-seven.css";
import "./game-world.css";
import "./finale.css";
import "./level-seven-picture.css";
import "./host-create.css";
import "./player-storybook.css";
import "./global-responsive.css";

const root = document.getElementById("root");
if (!root) throw new Error("Root element not found");

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>
);
