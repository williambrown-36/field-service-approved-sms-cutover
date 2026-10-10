import { createServer } from "node:http";
import { ZodError } from "zod";
import { workOrderNoticeSchema } from "./approved_message_catalog.js";
import { InfraiError } from "./infrai_sms.js";
import { notifyWorkOrder } from "./work_order_notifier.js";

const port = Number(process.env.PORT ?? 3000);
const apiKey = process.env.INFRAI_API_KEY;

function reply(response: import("node:http").ServerResponse, status: number, body: unknown) {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(JSON.stringify(body));
}

async function readJson(request: import("node:http").IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(Buffer.from(chunk));
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

export const server = createServer(async (request, response) => {
  if (request.method !== "POST" || request.url !== "/work-orders/notify") {
    reply(response, 404, { error: "route not found" });
    return;
  }

  try {
    if (!apiKey) throw new Error("INFRAI_API_KEY is required");
    const notice = workOrderNoticeSchema.parse(await readJson(request));
    reply(response, 202, await notifyWorkOrder(notice, apiKey));
  } catch (error) {
    if (error instanceof ZodError || error instanceof SyntaxError) {
      reply(response, 400, { error: "invalid request body" });
      return;
    }
    if (error instanceof InfraiError) {
      const status = error.status >= 400 && error.status < 500 ? error.status : 502;
      reply(response, status, { error: error.code, detail: error.detail });
      return;
    }
    reply(response, 500, { error: error instanceof Error ? error.message : "request failed" });
  }
});

if (process.env.NODE_ENV !== "test") {
  server.listen(port, () => console.log(`field-service SMS gateway listening on :${port}`));
}
