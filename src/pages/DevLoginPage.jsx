import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { resolveRedirect, useAuth } from "@/lib/auth";
import { getErrorMessage } from "@/lib/errors";
import { FormField, Spinner, useToast } from "@/components";
import { BrandLogo } from "@/components/BrandLogo";

export function DevLoginPage() {
  const { t } = useTranslation("common");
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [identifier, setIdentifier] = useState("citizen@example.com");
  const [password, setPassword] = useState("Password123");
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError("");

    if (!identifier.trim() || !password) {
      setFormError(t("errors.REQUIRED"));
      return;
    }

    setIsSubmitting(true);
    try {
      const signedInUser = await login(identifier.trim(), password);
      toast.success(t("buttons.login"));
      if (signedInUser.mustChangePassword) {
        navigate("/change-password", { replace: true });
        return;
      }
      const from = searchParams.get("from");
      navigate(resolveRedirect(from, signedInUser.role), { replace: true });
    } catch (error) {
      setFormError(getErrorMessage(error, t));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-md py-8">
      <div className="card p-6 sm:p-7">
        <div className="mb-5 text-center">
          <div className="mb-3 flex justify-center">
            <BrandLogo variant="light" />
          </div>
          <h1 className="page-title">{t("pages.devLoginTitle")}</h1>
          <p className="mt-1.5 text-sm text-muted">
            {t("pages.devLoginSubtitle")}
          </p>
        </div>

        {formError ? (
          <div
            role="alert"
            className="mb-4 rounded-xl border border-danger/25 bg-danger-bg px-3.5 py-2.5 text-sm font-semibold text-danger"
          >
            {formError}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} noValidate>
          <FormField
            label={t("pages.devLoginIdentifier")}
            htmlFor="dev-login-identifier"
            required
          >
            <input
              id="dev-login-identifier"
              type="text"
              autoComplete="username"
              className="input ltr-value"
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
            />
          </FormField>

          <FormField
            label={t("pages.devLoginPassword")}
            htmlFor="dev-login-password"
            required
          >
            <input
              id="dev-login-password"
              type="password"
              autoComplete="current-password"
              className="input ltr-value"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </FormField>

          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-primary mt-2 w-full"
          >
            {isSubmitting ? <Spinner size="sm" /> : null}
            <span>{t("pages.devLoginSubmit")}</span>
          </button>
        </form>

        {import.meta.env.VITE_USE_MOCKS === "true" ? (
          <p className="mt-5 rounded-xl bg-sky/70 px-3.5 py-2.5 text-xs text-navy">
            {t("pages.devLoginHint")}
          </p>
        ) : null}
      </div>
    </div>
  );
}
