import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import ChangePasswordPage from "./pages/ChangePasswordPage";
import ProfilePage from "./pages/ProfilePage";

export const routes = [
  { path: "/login", layout: "public", element: <LoginPage /> },
  { path: "/register", layout: "public", element: <RegisterPage /> },
  { path: "/forgot-password", layout: "public", element: <ForgotPasswordPage /> },
  { path: "/reset-password", layout: "public", element: <ResetPasswordPage /> },
  { path: "/change-password", layout: "shared", element: <ChangePasswordPage /> },
  { path: "/profile", layout: "shared", element: <ProfilePage /> },
];

export const nav = [{ layout: "shared", to: "/profile", labelKey: "auth:nav.profile", order: 80 }];
