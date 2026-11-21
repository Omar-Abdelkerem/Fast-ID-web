import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost } from "./api";

const AuthContext = createContext(null);

const roleHomes = { CITIZEN: "/applications", ADMIN: "/admin", AGENT: "/agent/deliveries" };
export const getRoleHome = (role) => roleHomes[role] || "/";

// which role a path belongs to (null = any signed-in user may open it)
function roleOfPath(path) {
  if (path === "/admin" || path.startsWith("/admin/")) return "ADMIN";
  if (path.startsWith("/agent")) return "AGENT";
  if (["/applications", "/apply", "/credentials"].some((p) => path === p || path.startsWith(`${p}/`))) return "CITIZEN";
  return null;
}

// returns `from` only if it is a safe internal path the role may open, otherwise the role's home
export function resolveRedirect(from, role) {
  if (typeof from !== "string" || !from.startsWith("/") || from.startsWith("//") || from.includes("\\")) return getRoleHome(role);
  const needed = roleOfPath(from.split("?")[0]);
  return needed && needed !== role ? getRoleHome(role) : from;
}

export function AuthProvider({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // restore the session on app start
  useEffect(() => {
    let active = true;
    apiGet("/auth/me")
      .then((res) => active && setUser(res.data))
      .catch(() => active && setUser(null))
      .finally(() => active && setIsLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const endSession = useCallback(() => {
    setUser(null);
    queryClient.clear();
  }, [queryClient]);

  // global API reactions (the api layer only announces them)
  useEffect(() => {
    const onUnauthenticated = () => {
      endSession();
      const from = `${location.pathname}${location.search}`;
      navigate(`/login?from=${encodeURIComponent(from)}`, { replace: true });
    };
    const onPasswordChange = () => navigate("/change-password", { replace: true });
    const onDisabled = () => {
      endSession();
      navigate("/login", { replace: true });
    };
    window.addEventListener("fid:unauthenticated", onUnauthenticated);
    window.addEventListener("fid:password-change-required", onPasswordChange);
    window.addEventListener("fid:account-disabled", onDisabled);
    return () => {
      window.removeEventListener("fid:unauthenticated", onUnauthenticated);
      window.removeEventListener("fid:password-change-required", onPasswordChange);
      window.removeEventListener("fid:account-disabled", onDisabled);
    };
  }, [endSession, location.pathname, location.search, navigate]);

  const value = useMemo(
    () => ({
      user,
      isLoading,
      isAuthenticated: Boolean(user),
      login: async (identifier, password) => {
        const res = await apiPost("/auth/login", { identifier, password });
        setUser(res.data);
        return res.data;
      },
      register: async (payload) => {
        const res = await apiPost("/auth/register", payload);
        setUser(res.data);
        return res.data;
      },
      logout: async () => {
        try {
          await apiPost("/auth/logout");
        } finally {
          endSession();
        }
      },
      refreshUser: async () => {
        const res = await apiGet("/auth/me");
        setUser(res.data);
        return res.data;
      },
      hasRole: (role) => user?.role === role,
    }),
    [user, isLoading, endSession]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside <AuthProvider>");
  return context;
}
