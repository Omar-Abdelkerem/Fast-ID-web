// Mocks are development tooling only: they never run in a production build.
export const USE_MOCKS = import.meta.env.DEV && import.meta.env.VITE_USE_MOCKS === "true";
