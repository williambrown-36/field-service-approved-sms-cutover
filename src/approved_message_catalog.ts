import { z } from "zod";

export const workOrderNoticeSchema = z.discriminatedUnion("status", [
  z.object({
    workOrderId: z.string().min(1),
    status: z.literal("dispatched"),
    customerPhone: z.string().regex(/^\+[1-9]\d{7,14}$/),
    technicianName: z.string().min(1),
    arrivalWindow: z.string().min(1),
    photoUrls: z.array(z.string().url()).max(8).default([]),
  }).strict(),
  z.object({
    workOrderId: z.string().min(1),
    status: z.literal("on_site"),
    customerPhone: z.string().regex(/^\+[1-9]\d{7,14}$/),
    technicianName: z.string().min(1),
    photoUrls: z.array(z.string().url()).max(8).default([]),
  }).strict(),
  z.object({
    workOrderId: z.string().min(1),
    status: z.literal("completed"),
    customerPhone: z.string().regex(/^\+[1-9]\d{7,14}$/),
    technicianName: z.string().min(1),
    photoUrls: z.array(z.string().url()).min(1).max(8),
    followUpUrl: z.string().url(),
  }).strict(),
]);

export type WorkOrderNotice = z.infer<typeof workOrderNoticeSchema>;

const approvedCatalog = {
  dispatched: {
    templateId: "field_dispatch_v4",
    signature: "Harbor Home Service",
  },
  on_site: {
    templateId: "field_arrival_v2",
    signature: "Harbor Home Service",
  },
  completed: {
    templateId: "field_follow_up_v3",
    signature: "Harbor Home Service",
  },
} as const;

export type ApprovedMessage = {
  to: string;
  template_id: string;
  template_vars: Record<string, string>;
  audit: {
    workOrderId: string;
    status: WorkOrderNotice["status"];
    signature: string;
    photoCount: number;
  };
};

export function selectApprovedMessage(notice: WorkOrderNotice): ApprovedMessage {
  const approved = approvedCatalog[notice.status];
  const common = {
    work_order_id: notice.workOrderId,
    technician_name: notice.technicianName,
  };

  const template_vars = notice.status === "dispatched"
    ? { ...common, arrival_window: notice.arrivalWindow }
    : notice.status === "completed"
      ? { ...common, follow_up_url: notice.followUpUrl }
      : common;

  return {
    to: notice.customerPhone,
    template_id: approved.templateId,
    template_vars,
    audit: {
      workOrderId: notice.workOrderId,
      status: notice.status,
      signature: approved.signature,
      photoCount: notice.photoUrls.length,
    },
  };
}
