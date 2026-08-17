import { render } from "preact";
import { App } from "./App.js";
import type { TfPlan } from "../planTypes.js";

declare global {
  interface Window {
    __TERRA_UI_PLAN__: TfPlan;
  }
}

const root = document.getElementById("root")!;
render(<App plan={window.__TERRA_UI_PLAN__} />, root);
