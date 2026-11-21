import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "./i18n";
import "./index.css";
import { ToastProvider } from "@/components";
import { RootErrorBoundary } from "@/pages/RootErrorBoundary";
import App from "./App.jsx";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: true,
      retry: (failureCount, error) => {
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }
        return failureCount < 2;
      },
    },
    mutations: {
      retry: false,
    },
  },
});

async function enableMocksIfNeeded() {
  // Never run or bundle MSW mocks in production builds
  if (import.meta.env.DEV && import.meta.env.VITE_USE_MOCKS === "true") {
    const { worker } = await import("./mocks/browser");
    await worker.start({ onUnhandledRequest: "warn" });
  }
}

enableMocksIfNeeded().then(() => {
  createRoot(document.getElementById("root")).render(
    <StrictMode>
      <RootErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <ToastProvider>
            <BrowserRouter>
              <App />
            </BrowserRouter>
          </ToastProvider>
        </QueryClientProvider>
      </RootErrorBoundary>
    </StrictMode>
  );
});
