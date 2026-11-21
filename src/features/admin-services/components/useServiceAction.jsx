import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ConfirmDialog, useLocalized, useToast } from "@/components";
import { getErrorMessage } from "@/lib/errors";
import { publishService, unpublishService, deleteService } from "../api";

const actionFunctions = {
  publish: publishService,
  unpublish: unpublishService,
  delete: deleteService,
};

// Shared by the list page and the editor: ask to confirm, run the action, refresh the lists.
// Returns { request(service, action), dialog } - render `dialog` once in the page.
export default function useServiceAction({ onDone } = {}) {
  const { t } = useTranslation("admin-services");
  const { localize } = useLocalized();
  const toast = useToast();
  const queryClient = useQueryClient();

  // e.g. { service, action: "publish" }
  const [pending, setPending] = useState(null);

  const mutation = useMutation({
    mutationFn: ({ service, action }) => actionFunctions[action](service.id),
    onSuccess: (_data, { action }) => {
      toast.success(t(`toast.${action}`));
      queryClient.invalidateQueries({ queryKey: ["admin", "services"] });
      queryClient.invalidateQueries({ queryKey: ["services"] });
      setPending(null);
      if (onDone) onDone(action);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, t));
      // the state may have changed on the server, so reload
      queryClient.invalidateQueries({ queryKey: ["admin", "services"] });
      setPending(null);
    },
  });

  const dialog = (
    <ConfirmDialog
      open={Boolean(pending)}
      title={pending ? t(`confirm.${pending.action}.title`) : ""}
      message={pending ? t(`confirm.${pending.action}.message`, { name: localize(pending.service.draft.name) }) : ""}
      confirmText={pending ? t(`actions.${pending.action}`) : ""}
      danger={pending?.action === "delete" || pending?.action === "unpublish"}
      isLoading={mutation.isPending}
      onConfirm={() => mutation.mutate(pending)}
      onCancel={() => setPending(null)}
    />
  );

  return { request: (service, action) => setPending({ service, action }), dialog };
}
