import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FormField, Modal, useLocalized, useToast } from "@/components";
import { applyServerErrors, getErrorMessage } from "@/lib/errors";
import { createStaff, getGovernorates, updateStaff } from "../api";

const phoneRegex = /^(?:\+20|20|0)1[0125][0-9]{8}$/;
const nameOk = (value) => value.trim().length >= 3 && value.trim().length <= 100 && value.trim().split(/\s+/).length >= 2 && /^[\p{L}\s'.-]+$/u.test(value.trim());
const passwordOk = (value) => value.length >= 8 && value.length <= 128 && /\p{L}/u.test(value) && /\d/.test(value);

// a random strong password, shown once so the admin can share it
function generatePassword() {
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz";
  const digits = "23456789";
  const pick = (chars, count) => Array.from(crypto.getRandomValues(new Uint32Array(count)), (n) => chars[n % chars.length]).join("");
  const mixed = (pick(letters, 8) + pick(digits, 3)).split("");
  mixed.sort(() => crypto.getRandomValues(new Uint8Array(1))[0] - 128);
  return mixed.join("");
}

// staff = the user being edited, or null to create a new one
export default function StaffFormModal({ staff, onClose }) {
  const { t } = useTranslation("admin-people");
  const { localize } = useLocalized();
  const toast = useToast();
  const queryClient = useQueryClient();
  const isEdit = Boolean(staff);
  const [generated, setGenerated] = useState("");

  const governoratesQuery = useQuery({ queryKey: ["reference", "governorates"], queryFn: getGovernorates, staleTime: Infinity });

  const schema = z
    .object({
      fullName: z.string().refine(nameOk, "fullName"),
      email: z.string().trim().min(1, "required").email("email"),
      phone: z.string().trim().regex(phoneRegex, "phone"),
      role: z.enum(["ADMIN", "AGENT"]),
      governorate: z.string(),
      temporaryPassword: z.string(),
      isActive: z.boolean(),
    })
    .superRefine((values, ctx) => {
      if (values.role === "AGENT" && !values.governorate) ctx.addIssue({ code: "custom", path: ["governorate"], message: "required" });
      if (!isEdit && !passwordOk(values.temporaryPassword)) ctx.addIssue({ code: "custom", path: ["temporaryPassword"], message: "password" });
    });

  const { register, control, handleSubmit, setValue, setError, formState } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      fullName: staff?.fullName || "",
      email: staff?.email || "",
      phone: staff?.phone || "",
      role: staff?.role || "AGENT",
      governorate: staff?.governorate || "",
      temporaryPassword: "",
      isActive: staff?.isActive ?? true,
    },
  });
  const { errors } = formState;
  const role = useWatch({ control, name: "role" });
  const fieldError = (name) => {
    const error = errors[name];
    if (!error) return undefined;
    return error.type === "server" ? error.message : t(`validation.${error.message}`);
  };

  const mutation = useMutation({
    mutationFn: (values) => {
      const phone = values.phone.trim().replace(/^\+?20/, "0");
      if (!isEdit) {
        const body = { fullName: values.fullName.trim(), email: values.email.trim(), phone, role: values.role, temporaryPassword: values.temporaryPassword };
        if (values.role === "AGENT") body.governorate = values.governorate;
        return createStaff(body);
      }
      // only the changed fields; at least one is required
      const changes = {};
      if (values.fullName.trim() !== staff.fullName) changes.fullName = values.fullName.trim();
      if (phone !== staff.phone) changes.phone = phone;
      if (staff.role === "AGENT" && values.governorate !== staff.governorate) changes.governorate = values.governorate;
      if (values.isActive !== staff.isActive) changes.isActive = values.isActive;
      if (Object.keys(changes).length === 0) throw Object.assign(new Error("no changes"), { code: "NO_CHANGES" });
      return updateStaff(staff.id, changes);
    },
    onSuccess: () => {
      toast.success(t(isEdit ? "staff.updated" : "staff.created"));
      queryClient.invalidateQueries({ queryKey: ["admin", "staff"] });
      onClose();
    },
    onError: (error) => {
      if (error.code === "NO_CHANGES") return toast.info(t("staff.noChanges"));
      if (error.code === "EMAIL_ALREADY_REGISTERED") return setError("email", { type: "server", message: getErrorMessage(error, t) });
      if (!applyServerErrors(error, setError, t)) toast.error(getErrorMessage(error, t));
    },
  });

  // deactivating asks for a confirmation first (a second click on the same button)
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);
  const activeValue = useWatch({ control, name: "isActive" });
  const deactivating = isEdit && staff.isActive && activeValue === false;

  function onSubmit(values) {
    if (deactivating && !confirmDeactivate) return setConfirmDeactivate(true);
    mutation.mutate(values);
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={t(isEdit ? "staff.editTitle" : "staff.createTitle")}
      size="md"
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={mutation.isPending}>{t("cancel")}</button>
          <button type="submit" form="staff-form" className={`btn ${confirmDeactivate ? "btn-danger" : "btn-primary"}`} disabled={mutation.isPending}>
            {confirmDeactivate ? t("staff.confirmDeactivate") : t("save")}
          </button>
        </>
      }
    >
      <form id="staff-form" onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-3">
        {confirmDeactivate && <p role="alert" className="rounded-xl bg-amber-100 p-2 text-sm text-warning dark:bg-[#3d3010] dark:text-[#f0c36a]">{t("staff.deactivateWarning")}</p>}
        <FormField label={t("staff.fullName")} htmlFor="staff-name" error={fieldError("fullName")}>
          <input id="staff-name" className="input" {...register("fullName")} />
        </FormField>
        <FormField label={t("staff.email")} htmlFor="staff-email" error={fieldError("email")}>
          <input id="staff-email" type="email" dir="ltr" className="input text-start" readOnly={isEdit} {...register("email")} />
        </FormField>
        <FormField label={t("staff.phone")} htmlFor="staff-phone" error={fieldError("phone")}>
          <input id="staff-phone" type="tel" dir="ltr" className="input text-start" {...register("phone")} />
        </FormField>
        <FormField label={t("staff.role")} htmlFor="staff-role">
          <select id="staff-role" className="select" disabled={isEdit} {...register("role")}>
            <option value="AGENT">{t("roles.AGENT")}</option>
            <option value="ADMIN">{t("roles.ADMIN")}</option>
          </select>
        </FormField>
        {role === "AGENT" && (
          <FormField label={t("staff.governorate")} htmlFor="staff-governorate" error={fieldError("governorate")}>
            <select id="staff-governorate" className="select" {...register("governorate")}>
              <option value="">{t("staff.pickGovernorate")}</option>
              {(governoratesQuery.data || []).map((g) => <option key={g.code} value={g.code}>{localize(g.name)}</option>)}
            </select>
          </FormField>
        )}
        {!isEdit && (
          <FormField label={t("staff.temporaryPassword")} htmlFor="staff-password" error={fieldError("temporaryPassword")} hint={t("staff.passwordHint")}>
            <div className="flex gap-2">
              <input id="staff-password" dir="ltr" autoComplete="new-password" className="input text-start" {...register("temporaryPassword")} />
              <button
                type="button"
                className="btn btn-secondary shrink-0"
                onClick={() => {
                  const password = generatePassword();
                  setValue("temporaryPassword", password, { shouldValidate: true });
                  setGenerated(password);
                }}
              >
                {t("staff.generate")}
              </button>
            </div>
            {generated && <p className="mt-1 text-xs text-muted">{t("staff.shownOnce")}</p>}
          </FormField>
        )}
        {isEdit && (
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input type="checkbox" {...register("isActive", { onChange: () => setConfirmDeactivate(false) })} />
            {t("staff.active")}
          </label>
        )}
      </form>
    </Modal>
  );
}
