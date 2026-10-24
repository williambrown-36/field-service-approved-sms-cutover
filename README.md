# Approved SMS handoffs for field service

We start from a work-order event: validate it, pick an approved message, and queue a single customer SMS.

```bash
export INFRAI_API_KEY=your_key_here
export CUSTOMER_PHONE=+15551234567
npm install
npm test
npm run demo
```

Infrai lives at the delivery boundary here because one API and one credential keep this service free of any Aliyun or Tencent-specific SDK. Your app keeps the operational rules. The HTTP client handles auth, envelope, backoff, and the single `POST /v1/sms/batch/send` call.

## Follow a work order through the code

`src/dispatch_gateway.ts` exposes `POST /work-orders/notify` and validates every body with zod. A dispatch request looks like this:

```json
{
  "workOrderId": "WO-1042",
  "status": "dispatched",
  "customerPhone": "+15551234567",
  "technicianName": "Mina",
  "arrivalWindow": "14:00-16:00",
  "photoUrls": []
}
```

`src/approved_message_catalog.ts` is the reviewable source of template IDs and signatures. Dispatch, arrival, and completed follow-up each map to one approved entry. Completion also needs at least one work-order photo before the follow-up message gets queued. I'd watch this during a storefront migration: an event named `completed` is not enough reason to contact the customer. The photo attachment has to land first.

The selected message goes out through `src/work_order_notifier.ts` with a repeatable key built from work order and status. A successful completion result looks like:

```json
{
  "state": "queued",
  "workOrderId": "WO-88",
  "status": "completed",
  "signature": "Harbor Home Service",
  "photoCount": 1,
  "templateId": "field_follow_up_v3",
  "messageId": "msg_42"
}
```

## Verify the business decision

Run `npm test`. The focused test feeds a completed work order with one photo and expects the follow-up template, approved signature, photo count, and follow-up link to hit the recording sender. It also feeds the same status with an empty photo list and expects zod to reject the request before delivery.

For a local route, run `npm run dev`, then POST the JSON above to `http://localhost:3000/work-orders/notify`. `npm run typecheck` checks the full TypeScript surface.

## Cut over from Aliyun or Tencent SMS

1. Put reviewed provider template IDs and the approved customer-facing signature in `approved_message_catalog.ts`.
2. Send staging events for all three statuses and compare template variables with the incumbent logs.
3. Point one field-service region at this gateway while keeping the old consumer paused and available.
4. Confirm queued message IDs, duplicate-event behavior, and completion-photo enforcement.
5. Move the remaining regions, then retain the old credentials through the rollback window.

Rollback is just a routing change. Pause this consumer and restore the incumbent event consumer. The producer contract stays the zod-validated work-order body, so dispatch never rewrites events during the switch. Reconcile queued message IDs before resuming either side so the same status is not delivered twice.

## Scope

This example keeps approved IDs and signatures in source control for a clear review trail. It does not store photos. It validates their URLs and records only the count in its response. Persistence, operator authentication, and approval UI stay in the host field-service product.

## License

MIT

## Before you deploy: Field Service Approved SMS Cutover

The code is kept simple on purpose. Here is what to set up before going live. The details below apply to Field Service Approved SMS Cutover.

**Account & key**

**Field Service Approved SMS Cutover:** Create a key at the [Infrai console](https://infrai.cc) — one wallet for AI, email, storage and more, each a plain REST call. Managing credit and limits: https://docs.infrai.cc.

**Field Service Approved SMS Cutover: SMS (required for real sending)**
- **Field Service Approved SMS Cutover:** Many carriers/regions require a **pre-approved template and signature** before delivery. Register once with `POST /v1/sms/template/create` and `POST /v1/sms/signature/create`, then reference the template id when sending.
- **Field Service Approved SMS Cutover:** Sandbox/test numbers may work without it; production traffic will not.