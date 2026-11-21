import { useTranslation } from "react-i18next";
import { Modal } from "./Modal";
import { Spinner } from "./Spinner";

export function ConfirmDialog({
  open,
  title,
  message,
  confirmText,
  danger = false,
  isLoading = false,
  onConfirm,
  onCancel,
}) {
  const { t } = useTranslation("common");

  return (
    <Modal
      open={open}
      onClose={isLoading ? undefined : onCancel}
      title={title}
      size="sm"
      footer={
        <>
          <button
            type="button"
            className="btn-secondary"
            disabled={isLoading}
            onClick={onCancel}
          >
            {t("buttons.cancel")}
          </button>
          <button
            type="button"
            className={danger ? "btn-danger" : "btn-primary"}
            disabled={isLoading}
            onClick={onConfirm}
          >
            {isLoading ? <Spinner size="sm" /> : null}
            <span>{confirmText || t("buttons.confirm")}</span>
          </button>
        </>
      }
    >
      <p className="text-sm text-espresso">{message}</p>
    </Modal>
  );
}
