import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components";
import { getErrorMessage } from "@/lib/errors";
import { confirmDelivery } from "../api";

// 6-digit code entry + "Confirm delivery". Calls onLocked when the code gets locked.
export default function CodeEntry({ deliveryId, locked, onLocked, onDelivered }) {
  const { t } = useTranslation("agent");
  const toast = useToast();
  const queryClient = useQueryClient();
  const [code, setCode] = useState("");
  const [errorText, setErrorText] = useState("");

  const mutation = useMutation({
    mutationFn: () => confirmDelivery(deliveryId, code),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agent", "deliveries"] });
      onDelivered();
    },
    onError: (error) => {
      setErrorText(getErrorMessage(error, t));
      if (error.code === "INVALID_DELIVERY_CODE") setCode(""); // wrong code: clear the input
      if (error.code === "DELIVERY_CODE_LOCKED") onLocked();
      if (error.code === "INVALID_STATUS_TRANSITION") {
        toast.error(t("errors.INVALID_STATUS_TRANSITION"));
        queryClient.invalidateQueries({ queryKey: ["agent", "deliveries"] });
      }
    },
  });

  const onChange = (event) => {
    // digits only, 6 at most
    setCode(event.target.value.replace(/\D/g, "").slice(0, 6));
    setErrorText("");
  };

  return (
    <form
      className="card space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        if (code.length === 6 && !locked) mutation.mutate();
      }}
    >
      <label htmlFor="delivery-code" className="label">{t("code.label")}</label>
      <input
        id="delivery-code"
        dir="ltr"
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        value={code}
        onChange={onChange}
        disabled={locked || mutation.isPending}
        aria-invalid={Boolean(errorText)}
        className="input min-h-[56px] text-center text-2xl tracking-[0.5em]"
        placeholder="••••••"
      />
      {errorText && <p role="alert" className="field-error text-sm">{errorText}</p>}
      {locked && <p role="alert" className="rounded-lg bg-red-50 p-2 text-sm font-semibold text-danger">⚠ {t("code.locked")}</p>}
      <button type="submit" className="btn btn-primary min-h-[48px] w-full" disabled={code.length !== 6 || locked || mutation.isPending}>
        {mutation.isPending ? t("code.confirming") : t("code.confirm")}
      </button>
    </form>
  );
}
