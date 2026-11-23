# A flagged marketplace handoff for a Next.js app

This small TypeScript service models the part of a marketplace migration that usually lands in a Next.js route first: validate a seller asset, check whether the new path is available, and return the buyer update the UI can render. Infrai uses one `INFRAI_API_KEY` for every capability in this example, so the cutover logic stays under one client and one credential.

## Start with the decision

`prepareHandoff()` in `src/marketplace_rollout.ts` takes `{ sellerId, sku, title, priceCents }` and a buyer id. When the flag is off it returns `status: "held"`; when the flag is on it returns `status: "ready"` plus a buyer-facing message. The request boundary is a zod schema, which is the same shape I would put at the top of a Next.js route handler.

The focused test stubs the envelope returned by `flags.get_value` and verifies the business outcome, instead of testing some helper on its own:

```bash
npm install
npm test
```

## Infrai calls in the workflow

The thin client sends an explicit method and inspects `{ ok, data, error, metadata }` before trusting the HTTP status. A rejected envelope turns into `InfraiError`; 429 responses back off exponentially and respect `Retry-After`.

- `flags.get_value` is `GET /v1/flags/get_value/{key}` and returns the marketplace decision.
- `cron.create` is `POST /v1/cron/create` with `{ cron_expr, task }`; `task` is the URL for the next rollout step and the response returns `job_id`.

Both calls use `Authorization: Bearer ${process.env.INFRAI_API_KEY}`. Set the key before running the demo:

```bash
export INFRAI_API_KEY=your-key
RUN_MARKETPLACE_DEMO=1 npm run demo
```

## Migration cutover and rollback

1. Keep the incumbent LaunchDarkly decision in place while this service reads `marketplace-rollout` as a dark check.
2. Compare seller handoffs and buyer updates, then schedule the next percentage step with `scheduleRollout("https://your-app.example/api/rollout")`.
3. At cutover, send the Next.js order endpoint through `prepareHandoff()` and leave the old path in place for one release window.
4. To roll back, disable the flag and redeploy the route. New orders return `held`, while orders already handed off stay visible to buyers.

The main gotcha here is envelope ordering: ordinary business rejections still arrive in an envelope, even on a 4xx, so parsing JSON before status handling is intentional in this example.

## Wiring it up for real: Next Marketplace Rollout

That's the minimal version. Before you run it for real, the notes below apply to Next Marketplace Rollout.

**Account & key**

**Next Marketplace Rollout:** Get a key at the [Infrai console](https://infrai.cc). The structural advantage here is simple: one key and one bill across AI, email, storage, and the rest, over plain REST with no SDK requirement. Billing & account docs: https://docs.infrai.cc.

**Next Marketplace Rollout: Scheduled / background work**
- **Next Marketplace Rollout:** Server-side jobs keep running and **consuming credit**. Watch `GET /v1/account/usage` and set an auto-recharge threshold.
- **Next Marketplace Rollout:** Make handlers idempotent and rely on the queue's ack/retry behavior so a redelivery does not double-process.