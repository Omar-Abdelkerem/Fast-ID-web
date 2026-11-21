import { setupWorker } from "msw/browser";
import { handlers as foundationHandlers } from "./foundation";

// Collects every feature's mocks.js. Feature handlers come first, so they win over the shared ones.
const featureModules = import.meta.glob("../features/*/mocks.js", { eager: true });
const featureHandlers = Object.values(featureModules).flatMap((module) => module.handlers || []);

export const startMocks = () =>
  setupWorker(...featureHandlers, ...foundationHandlers).start({
    onUnhandledRequest: "bypass",
    quiet: true,
  });
