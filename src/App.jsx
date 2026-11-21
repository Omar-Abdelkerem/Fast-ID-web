import { BrowserRouter, Link, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { EmptyState, Spinner, ToastProvider } from "@/components";
import { AuthProvider, useAuth } from "@/lib/auth";
import { getAvailableHome, routes } from "@/lib/registry";
import { layoutByLayout, layoutByRole } from "@/layouts";
import { BASE_PATH } from "@/lib/env";
import PublicLayout from "@/layouts/PublicLayout";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: true, staleTime: 15 * 1000 } },
});

// the role a layout needs (shared = any signed-in user)
const roleOfLayout = { admin: "ADMIN", agent: "AGENT", citizen: "CITIZEN" };

// Wraps a page: checks the session and the role, then renders the right shell around it
function Guarded({ layout, roles, children }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (layout === "public") return <PublicLayout>{children}</PublicLayout>;
  if (isLoading) return <Spinner size="lg" />;
  if (!user) return <Navigate to={`/login?from=${encodeURIComponent(location.pathname + location.search)}`} replace />;

  const required = roleOfLayout[layout];
  const allowed = roles || (required ? [required] : null);
  if (allowed && !allowed.includes(user.role)) return <Navigate to={getAvailableHome(user.role)} replace />;

  const Shell = layout === "shared" ? layoutByRole[user.role] : layoutByLayout[layout];
  return <Shell>{children}</Shell>;
}

// "/" goes to the role's home (or login) unless a feature registers its own landing page
function RootRedirect() {
  const { user, isLoading } = useAuth();
  if (isLoading) return <Spinner size="lg" />;
  return <Navigate to={user ? getAvailableHome(user.role) : "/login"} replace />;
}

function NotFoundPage() {
  const { t } = useTranslation();
  return (
    <EmptyState
      title={t("notFound.title")}
      text={t("notFound.text")}
      action={
        <Link to="/" className="btn btn-primary">
          {t("notFound.home")}
        </Link>
      }
    />
  );
}

export default function App() {
  const hasLanding = routes.some((route) => route.path === "/");
  return (
    <BrowserRouter basename={BASE_PATH}>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <AuthProvider>
            <Routes>
              {!hasLanding && <Route path="/" element={<RootRedirect />} />}
              {routes.map((route) => (
                <Route
                  key={route.path}
                  path={route.path}
                  element={
                    <Guarded layout={route.layout} roles={route.roles}>
                      {route.element}
                    </Guarded>
                  }
                />
              ))}
              <Route
                path="*"
                element={
                  <PublicLayout>
                    <NotFoundPage />
                  </PublicLayout>
                }
              />
            </Routes>
          </AuthProvider>
        </ToastProvider>
      </QueryClientProvider>
    </BrowserRouter>
  );
}
