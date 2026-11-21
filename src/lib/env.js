// Mocks run in development, or in the special demo build (npm run build:demo).
// A normal production build never includes them.
const mocksAllowed = import.meta.env.DEV || import.meta.env.MODE === "demo";
export const USE_MOCKS = mocksAllowed && import.meta.env.VITE_USE_MOCKS === "true";

// the base path the app is served from ("" when it is at the root of the domain)
export const BASE_PATH = import.meta.env.BASE_URL.replace(/\/$/, "");
