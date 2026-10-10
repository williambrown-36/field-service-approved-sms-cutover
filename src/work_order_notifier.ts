import { createHash } from "node:crypto";
import {
  selectApprovedMessage,
  type WorkOrderNotice,
} from "./approved_message_catalog.js";
import { infrai, type BatchSendResult } from "./infrai_sms.js";

export type SmsSender = (
  messages: Array<{
    to: string;
    template_id: string;
    template_vars: Record<string, string>;
  }>,
  idempotencyKey: string,
  apiKey: string,
) => Promise<BatchSendResult>;

export async function notifyWorkOrder(
  notice: WorkOrderNotice,
  apiKey: string,
  send: SmsSender = infrai.sms.batch.send,
) {
  const selected = selectApprovedMessage(notice);
  const idempotencyKey = createHash("sha256")
    .update(`${notice.workOrderId}:${notice.status}`)
    .digest("hex");
  const result = await send([{
    to: selected.to,
    template_id: selected.template_id,
    template_vars: selected.template_vars,
  }], idempotencyKey, apiKey);

  return {
    state: "queued" as const,
    ...selected.audit,
    templateId: selected.template_id,
    messageId: result.message_id,
    messageIds: result.message_ids,
  };
}
