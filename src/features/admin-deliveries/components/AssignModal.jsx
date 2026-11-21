import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Modal, FormField, Spinner, useToast } from "@/components";
import { getErrorMessage } from "@/lib/errors";
import { getActiveAgents, assignDelivery } from "../api";

export default function AssignModal({ delivery, onClose }) {
  const { t } = useTranslation("admin-deliveries");
  const toast = useToast();
  const queryClient = useQueryClient();
  const [agentId, setAgentId] = useState(delivery?.agent?.id || "");
  const [errorText, setErrorText] = useState("");

  const agentsQuery = useQuery({ queryKey: ["admin", "staff", "agents"], queryFn: getActiveAgents, enabled: Boolean(delivery) });

  const assignMutation = useMutation({
    mutationFn: () => assignDelivery(delivery.id, agentId),
    onSuccess: () => {
      toast.success(t("assign.success"));
      queryClient.invalidateQueries({ queryKey: ["admin", "deliveries"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "applications"] });
      onClose();
    },
    onError: (error) => {
      setErrorText(getErrorMessage(error, t));
      // the status may have changed meanwhile, so reload and explain
      if (error.code === "INVALID_STATUS_TRANSITION" || error.code === "DELIVERY_NOT_FOUND") {
        queryClient.invalidateQueries({ queryKey: ["admin", "deliveries"] });
      }
    },
  });

  if (!delivery) return null;
  const isReassign = Boolean(delivery.agent);

  return (
    <Modal
      open
      onClose={onClose}
      title={isReassign ? t("assign.reassignTitle") : t("assign.title")}
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose} disabled={assignMutation.isPending}>{t("assign.cancel")}</button>
          <button className="btn btn-primary" disabled={!agentId || assignMutation.isPending} onClick={() => assignMutation.mutate()}>
            {t("assign.confirm")}
          </button>
        </>
      }
    >
      <p className="mb-3 text-sm text-muted">{delivery.applicationNumber}</p>
      {agentsQuery.isLoading && <Spinner />}
      {agentsQuery.isError && <p className="text-danger text-sm">{getErrorMessage(agentsQuery.error, t)}</p>}
      {agentsQuery.isSuccess && (
        <FormField label={t("assign.agent")} htmlFor="assign-agent">
          <select id="assign-agent" className="select" value={agentId} onChange={(e) => { setAgentId(e.target.value); setErrorText(""); }}>
            <option value="">{t("assign.pick")}</option>
            {agentsQuery.data.map((agent) => <option key={agent.id} value={agent.id}>{agent.fullName}</option>)}
          </select>
        </FormField>
      )}
      {errorText && <p role="alert" className="field-error mt-2">{errorText}</p>}
    </Modal>
  );
}
