import { useCallback } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AuthProvider, RequireAuth, RequireRole, useAuth } from "@/lib/auth";
import { PageHeader, Spinner, useToast } from "@/components";
import { DevUiPage } from "@/components/DevUiPage";
import {
  AdminLayout,
  AgentLayout,
  CitizenLayout,
  PublicLayout,
  SharedLayout,
} from "@/layouts";
import { DevLoginPage } from "@/pages/DevLoginPage";
import { ForbiddenPage } from "@/pages/ForbiddenPage";
import { NotFoundPage } from "@/pages/NotFoundPage";

// Auto-discover feature routes from src/features/*/routes.jsx
const featureRouteModules = import.meta.glob("/src/features/*/routes.jsx", {
  eager: true,
});

const featureRoutes = [];

for (const moduleExports of Object.values(featureRouteModules)) {
  if (Array.isArray(moduleExports.routes)) {
    for (const route of moduleExports.routes) {
      if (route && route.path && route.element) {
        featureRoutes.push(route);
      }
    }
  }
}

const registeredPaths = new Set(featureRoutes.map((route) => route.path));

function FullPageSpinner() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center p-6">
      <Spinner size="lg" />
    </div>
  );
}

function DevRolePlaceholder({ titleKey }) {
  const { t } = useTranslation("common");
  const { user } = useAuth();
  return (
    <div className="space-y-4">
      <PageHeader
        title={t(titleKey)}
        subtitle={
          user
            ? `${user.fullName} · ${t(`roles.${user.role}`, {
                defaultValue: user.role,
              })}`
            : undefined
        }
      />
      <div className="card text-sm text-muted">{t("states.empty")}</div>
    </div>
  );
}

function NotFoundWrapper() {
  const { isAuthenticated } = useAuth();
  if (isAuthenticated) {
    return (
      <SharedLayout>
        <NotFoundPage />
      </SharedLayout>
    );
  }
  return (
    <PublicLayout>
      <NotFoundPage />
    </PublicLayout>
  );
}

function wrapFeatureRoute(route) {
  const forbiddenFallback = (
    <SharedLayout>
      <ForbiddenPage />
    </SharedLayout>
  );
  const loadingFallback = <FullPageSpinner />;

  switch (route.layout) {
    case "citizen":
      return (
        <RequireRole
          roles={route.roles || ["CITIZEN"]}
          fallback={forbiddenFallback}
          loadingFallback={loadingFallback}
        >
          <CitizenLayout>{route.element}</CitizenLayout>
        </RequireRole>
      );
    case "admin":
      return (
        <RequireRole
          roles={route.roles || ["ADMIN"]}
          fallback={forbiddenFallback}
          loadingFallback={loadingFallback}
        >
          <AdminLayout>{route.element}</AdminLayout>
        </RequireRole>
      );
    case "agent":
      return (
        <RequireRole
          roles={route.roles || ["AGENT"]}
          fallback={forbiddenFallback}
          loadingFallback={loadingFallback}
        >
          <AgentLayout>{route.element}</AgentLayout>
        </RequireRole>
      );
    case "shared":
      if (Array.isArray(route.roles) && route.roles.length > 0) {
        return (
          <RequireRole
            roles={route.roles}
            fallback={forbiddenFallback}
            loadingFallback={loadingFallback}
          >
            <SharedLayout>{route.element}</SharedLayout>
          </RequireRole>
        );
      }
      return (
        <RequireAuth loadingFallback={loadingFallback}>
          <SharedLayout>{route.element}</SharedLayout>
        </RequireAuth>
      );
    case "public":
    default:
      if (Array.isArray(route.roles) && route.roles.length > 0) {
        return (
          <RequireRole
            roles={route.roles}
            fallback={forbiddenFallback}
            loadingFallback={loadingFallback}
          >
            <PublicLayout>{route.element}</PublicLayout>
          </RequireRole>
        );
      }
      return <PublicLayout>{route.element}</PublicLayout>;
  }
}

export default function App() {
  const toast = useToast();
  const { t } = useTranslation("common");

  const handleNotify = useCallback(
    ({ type = "error", code, retryAfter }) => {
      let message;
      if (
        code === "RATE_LIMITED" &&
        typeof retryAfter === "number" &&
        retryAfter > 0
      ) {
        message = t("errors.RATE_LIMITED_WITH_WAIT", { seconds: retryAfter });
      } else {
        message = t(`errors.${code}`, { defaultValue: t("errors.UNKNOWN") });
      }

      if (type === "success") {
        toast.success(message);
      } else if (type === "info") {
        toast.info(message);
      } else {
        toast.error(message);
      }
    },
    [t, toast]
  );

  const forbiddenFallback = (
    <SharedLayout>
      <ForbiddenPage />
    </SharedLayout>
  );
  const loadingFallback = <FullPageSpinner />;

  return (
    <AuthProvider onNotify={handleNotify}>
      <Routes>
      {featureRoutes.map((route) => (
        <Route
          key={route.path}
          path={route.path}
          element={wrapFeatureRoute(route)}
        />
      ))}

      {/* Fallbacks before teammate features are merged */}
      {!registeredPaths.has("/") ? (
        <Route path="/" element={<Navigate to="/login" replace />} />
      ) : null}

      {!registeredPaths.has("/login") ? (
        <Route
          path="/login"
          element={
            <PublicLayout>
              <DevLoginPage />
            </PublicLayout>
          }
        />
      ) : null}

      {import.meta.env.DEV ? (
        <>
          <Route
            path="/dev/login"
            element={
              <PublicLayout>
                <DevLoginPage />
              </PublicLayout>
            }
          />
          <Route
            path="/dev/ui"
            element={
              <PublicLayout>
                <DevUiPage />
              </PublicLayout>
            }
          />

          {!registeredPaths.has("/applications") ? (
            <Route
              path="/applications"
              element={
                <RequireRole
                  roles={["CITIZEN"]}
                  fallback={forbiddenFallback}
                  loadingFallback={loadingFallback}
                >
                  <CitizenLayout>
                    <DevRolePlaceholder titleKey="nav.applications" />
                  </CitizenLayout>
                </RequireRole>
              }
            />
          ) : null}

          {!registeredPaths.has("/admin") ? (
            <Route
              path="/admin"
              element={
                <RequireRole
                  roles={["ADMIN"]}
                  fallback={forbiddenFallback}
                  loadingFallback={loadingFallback}
                >
                  <AdminLayout>
                    <DevRolePlaceholder titleKey="nav.admin" />
                  </AdminLayout>
                </RequireRole>
              }
            />
          ) : null}

          {!registeredPaths.has("/agent/deliveries") ? (
            <Route
              path="/agent/deliveries"
              element={
                <RequireRole
                  roles={["AGENT"]}
                  fallback={forbiddenFallback}
                  loadingFallback={loadingFallback}
                >
                  <AgentLayout>
                    <DevRolePlaceholder titleKey="nav.deliveries" />
                  </AgentLayout>
                </RequireRole>
              }
            />
          ) : null}

          {!registeredPaths.has("/change-password") ? (
            <Route
              path="/change-password"
              element={
                <RequireAuth loadingFallback={loadingFallback}>
                  <SharedLayout>
                    <DevRolePlaceholder titleKey="nav.changePassword" />
                  </SharedLayout>
                </RequireAuth>
              }
            />
          ) : null}
        </>
      ) : null}

      <Route path="*" element={<NotFoundWrapper />} />
      </Routes>
    </AuthProvider>
  );
}
