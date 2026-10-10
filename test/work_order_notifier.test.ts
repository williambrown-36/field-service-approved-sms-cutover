import assert from "node:assert/strict";
import test from "node:test";
import { workOrderNoticeSchema } from "../src/approved_message_catalog.js";
import { notifyWorkOrder, type SmsSender } from "../src/work_order_notifier.js";

test("completed work chooses follow-up SMS only after a photo is attached", async () => {
  const notice = workOrderNoticeSchema.parse({
    workOrderId: "WO-88",
    status: "completed",
    customerPhone: "+15551234567",
    technicianName: "Mina",
    photoUrls: ["https://cdn.example.test/work-orders/WO-88/after.jpg"],
    followUpUrl: "https://shop.example.test/service/WO-88/follow-up",
  });
  const calls: Parameters<SmsSender>[] = [];
  const sender: SmsSender = async (...args) => {
    calls.push(args);
    return { message_id: "msg_42" };
  };

  const result = await notifyWorkOrder(notice, "test-key", sender);

  assert.equal(result.state, "queued");
  assert.equal(result.templateId, "field_follow_up_v3");
  assert.equal(result.signature, "Harbor Home Service");
  assert.equal(result.photoCount, 1);
  assert.deepEqual(calls[0][0][0].template_vars, {
    work_order_id: "WO-88",
    technician_name: "Mina",
    follow_up_url: "https://shop.example.test/service/WO-88/follow-up",
  });
});

test("completed work without evidence is rejected at the request boundary", () => {
  const parsed = workOrderNoticeSchema.safeParse({
    workOrderId: "WO-89",
    status: "completed",
    customerPhone: "+15551234567",
    technicianName: "Mina",
    photoUrls: [],
    followUpUrl: "https://shop.example.test/service/WO-89/follow-up",
  });

  assert.equal(parsed.success, false);
});
