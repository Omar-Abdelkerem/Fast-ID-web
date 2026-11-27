import { useState } from "react";
import { useTranslation } from "react-i18next";

// A password input with a show / hide button. Pass the react-hook-form register() result as `registration`.
export default function PasswordInput({ id, registration, autoComplete, invalid }) {
  const { t } = useTranslation("auth");
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input
        id={id}
        type={visible ? "text" : "password"}
        dir="ltr"
        autoComplete={autoComplete}
        aria-invalid={invalid}
        className="input pe-11 text-start"
        {...registration}
      />
      <button
        type="button"
        onClick={() => setVisible((value) => !value)}
        aria-label={visible ? t("password.hide") : t("password.show")}
        aria-pressed={visible}
        className="absolute inset-y-0 end-0 flex w-10 items-center justify-center text-muted"
      >
        <span className="material-icons" aria-hidden="true">{visible ? "visibility_off" : "visibility"}</span>
      </button>
    </div>
  );
}
