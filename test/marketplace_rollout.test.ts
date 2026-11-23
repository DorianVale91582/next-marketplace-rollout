import assert from "node:assert/strict";
import { prepareHandoff } from "../src/marketplace_rollout.js";

const originalFetch = globalThis.fetch;
globalThis.fetch = async () => new Response(JSON.stringify({ ok: true, data: { value: false }, metadata: {} }), { status: 200 });
const held = await prepareHandoff({ sellerId: "seller-1", sku: "sku-1", title: "Notebook", priceCents: 1200 }, "buyer-1");
assert.equal(held.status, "held");
assert.match(held.buyerMessage, /queued/);
globalThis.fetch = originalFetch;
console.log("marketplace flag decision: disabled -> held");
