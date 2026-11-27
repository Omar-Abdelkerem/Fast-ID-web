import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FormField, PageHeader } from "@/components";

// A pasted verification link or a bare token: the token is the last path segment
export function extractToken(text) {
  const clean = text.trim().split(/[?#]/)[0].replace(/\/+$/, "");
  return clean.split("/").pop();
}

export default function VerifyPage() {
  const { t } = useTranslation("verify");
  const navigate = useNavigate();
  const [text, setText] = useState("");
  const [error, setError] = useState("");

  function onSubmit(event) {
    event.preventDefault();
    const token = extractToken(text);
    if (!token) return setError(t("enter.required"));
    navigate(`/verify/${encodeURIComponent(token)}`);
  }

  return (
    <div className="mx-auto max-w-lg">
      <PageHeader title={t("enter.title")} subtitle={t("enter.subtitle")} />
      <form onSubmit={onSubmit} noValidate className="card space-y-4">
        <FormField label={t("enter.label")} htmlFor="verify-code" error={error} hint={t("enter.hint")}>
          <input
            id="verify-code"
            dir="ltr"
            className="input text-start"
            value={text}
            onChange={(event) => {
              setText(event.target.value);
              setError("");
            }}
            aria-invalid={Boolean(error)}
          />
        </FormField>
        <button type="submit" className="btn btn-primary w-full">{t("enter.submit")}</button>
      </form>
    </div>
  );
}
