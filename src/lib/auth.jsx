/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, registerApiHandlers } from "@/lib/api";

const AuthContext = createContext(null);

const ROLE_HOMES = {
  CITIZEN: "/applications",
  ADMIN: "/admin",
  AGENT: "/agent/deliveries",
};

const AUTH_ONLY_PATHS = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/dev/login",
];

function matchesPrefix(pathname, prefix) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function getRoleHome(role) {
  return ROLE_HOMES[role] || "/";
}

export function resolveRedirect(from, role) {
  const fallback = getRoleHome(role);

  if (typeof from !== "string" || !from.startsWith("/")) {
    return fallback;
  }
  // Reject protocol-relative URLs and backslash bypasses
  if (from.startsWith("//") || from.includes("\\")) {
    return fallback;
  }

  const pathname = from.split(/[?#]/)[0];

  if (AUTH_ONLY_PATHS.some((authPath) => matchesPrefix(pathname, authPath))) {
    return fallback;
  }

  if (matchesPrefix(pathname, "/admin")) {
    return role === "ADMIN" ? from : fallback;
  }
  if (matchesPrefix(pathname, "/agent")) {
    return role === "AGENT" ? from : fallback;
  }
  if (
    matchesPrefix(pathname, "/applications") ||
    matchesPrefix(pathname, "/apply") ||
    matchesPrefix(pathname, "/credentials")
  ) {
    return role === "CITIZEN" ? from : fallback;
  }

  // Shared authenticated paths and public paths are allowed for any valid role
  if (
    pathname === "/" ||
    matchesPrefix(pathname, "/services") ||
    matchesPrefix(pathname, "/verify") ||
    matchesPrefix(pathname, "/profile") ||
    matchesPrefix(pathname, "/change-password") ||
    matchesPrefix(pathname, "/notifications")
  ) {
    return from;
  }

  return fallback;
}

function DefaultLoadingFallback() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-[40vh] items-center justify-center p-6"
    >
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-line border-t-terracotta-dark" />
    </div>
  );
}

function DefaultForbiddenFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center p-6">
      <div className="rounded-lg border border-line bg-white p-6 text-center shadow-sm">
        <p className="text-3xl font-bold text-danger">403</p>
      </div>
    </div>
  );
}

export function AuthProvider({ children, onNotify }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();

  const locationRef = useRef(location);
  const onNotifyRef = useRef(onNotify);

  useEffect(() => {
    locationRef.current = location;
  }, [location]);

  useEffect(() => {
    onNotifyRef.current = onNotify;
  }, [onNotify]);

  // Restore session on app mount without triggering global 401 redirects
  useEffect(() => {
    let active = true;

    async function bootstrapAuth() {
      try {
        const { data } = await apiGet("/auth/me", {
          skipGlobalHandlers: true,
        });
        if (active) {
          setUser(data);
        }
      } catch {
        if (active) {
          setUser(null);
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    bootstrapAuth();

    return () => {
      active = false;
    };
  }, []);

  // Register global API error reactions (401, 403 forced password / disabled, 429)
  useEffect(() => {
    return registerApiHandlers({
      onUnauthenticated: () => {
        setUser(null);
        queryClient.clear();
        const current = locationRef.current;
        if (current.pathname !== "/login") {
          const from = `${current.pathname}${current.search}`;
          navigate(`/login?from=${encodeURIComponent(from)}`, {
            replace: true,
          });
        }
      },
      onPasswordChangeRequired: () => {
        const current = locationRef.current;
        if (current.pathname !== "/change-password") {
          navigate("/change-password", { replace: true });
        }
      },
      onAccountDisabled: (error) => {
        setUser(null);
        queryClient.clear();
        onNotifyRef.current?.({
          type: "error",
          code: "ACCOUNT_DISABLED",
          error,
        });
        if (locationRef.current.pathname !== "/login") {
          navigate("/login", { replace: true });
        }
      },
      onRateLimited: (error) => {
        onNotifyRef.current?.({
          type: "error",
          code: "RATE_LIMITED",
          retryAfter: error?.retryAfter ?? null,
          error,
        });
      },
    });
  }, [navigate, queryClient]);

  const login = useCallback(async (identifier, password) => {
    const { data } = await apiPost(
      "/auth/login",
      { identifier, password },
      { skipGlobalHandlers: true }
    );
    setUser(data);
    return data;
  }, []);

  const register = useCallback(async (payload) => {
    const { data } = await apiPost("/auth/register", payload, {
      skipGlobalHandlers: true,
    });
    setUser(data);
    return data;
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiPost("/auth/logout", undefined, {
        skipGlobalHandlers: true,
      });
    } finally {
      setUser(null);
      queryClient.clear();
    }
  }, [queryClient]);

  const refreshUser = useCallback(async () => {
    const { data } = await apiGet("/auth/me");
    setUser(data);
    return data;
  }, []);

  const hasRole = useCallback(
    (role) => {
      if (!user) return false;
      if (Array.isArray(role)) {
        return role.includes(user.role);
      }
      return user.role === role;
    },
    [user]
  );

  const value = useMemo(
    () => ({
      user,
      isLoading,
      isAuthenticated: Boolean(user),
      login,
      register,
      logout,
      refreshUser,
      hasRole,
    }),
    [user, isLoading, login, register, logout, refreshUser, hasRole]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider.");
  }
  return context;
}

export function RequireAuth({ children, loadingFallback }) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return loadingFallback || <DefaultLoadingFallback />;
  }

  if (!isAuthenticated) {
    const from = `${location.pathname}${location.search}`;
    return (
      <Navigate to={`/login?from=${encodeURIComponent(from)}`} replace />
    );
  }

  if (user.mustChangePassword && location.pathname !== "/change-password") {
    return <Navigate to="/change-password" replace />;
  }

  return children;
}

export function RequireRole({
  roles,
  role,
  children,
  fallback,
  loadingFallback,
}) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return loadingFallback || <DefaultLoadingFallback />;
  }

  if (!isAuthenticated) {
    const from = `${location.pathname}${location.search}`;
    return (
      <Navigate to={`/login?from=${encodeURIComponent(from)}`} replace />
    );
  }

  if (user.mustChangePassword && location.pathname !== "/change-password") {
    return <Navigate to="/change-password" replace />;
  }

  const allowedRoles = Array.isArray(roles)
    ? roles
    : role
      ? [role]
      : [];

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return fallback || <DefaultForbiddenFallback />;
  }

  return children;
}
