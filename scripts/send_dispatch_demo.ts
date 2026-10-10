import { workOrderNoticeSchema } from "../src/approved_message_catalog.js";
import { notifyWorkOrder } from "../src/work_order_notifier.js";

const apiKey = process.env.INFRAI_API_KEY;
const customerPhone = process.env.CUSTOMER_PHONE;
if (!apiKey || !customerPhone) {
  throw new Error("INFRAI_API_KEY and CUSTOMER_PHONE are required");
}

const notice = workOrderNoticeSchema.parse({
  workOrderId: "WO-1042",
  status: "dispatched",
  customerPhone,
  technicianName: "Mina",
  arrivalWindow: "14:00-16:00",
  photoUrls: [],
});

console.log(await notifyWorkOrder(notice, apiKey));
