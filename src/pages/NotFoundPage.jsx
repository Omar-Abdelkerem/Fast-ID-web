import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { getRoleHome, useAuth } from "@/lib/auth";

export function NotFoundPage() {
  const { t } = useTranslation("common");
  const { user, isAuthenticated } = useAuth();
  const target = isAuthenticated && user ? getRoleHome(user.role) : "/";

  return (
    <div className="flex min-h-[50vh] items-center justify-center p-4">
      <div className="card max-w-md text-center">
        <p className="font-heading text-4xl font-bold text-blue">404</p>
        <h1 className="page-title mt-2">{t("pages.notFoundTitle")}</h1>
        <p className="mt-2 text-sm text-muted">{t("pages.notFoundMessage")}</p>
        <div className="mt-5">
          <Link to={target} className="btn-primary">
            {isAuthenticated ? t("app.goToDashboard") : t("buttons.goHome")}
          </Link>
        </div>
      </div>
    </div>
  );
}
