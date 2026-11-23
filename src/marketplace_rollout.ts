import { z } from "zod";
import { cron, flags } from "./infrai_client.js";

export const sellerAsset = z.object({ sellerId: z.string().min(1), sku: z.string().min(1), title: z.string().min(1), priceCents: z.number().int().positive() });
export type SellerAsset = z.infer<typeof sellerAsset>;

export type Handoff = { status: "ready" | "held"; sellerId: string; sku: string; buyerMessage: string };

export async function prepareHandoff(input: unknown, buyerId: string): Promise<Handoff> {
  const asset = sellerAsset.parse(input);
  const enabled = (await flags.getValue("marketplace-rollout")).value;
  if (!enabled) return { status: "held", sellerId: asset.sellerId, sku: asset.sku, buyerMessage: "Marketplace orders are queued for the cutover." };
  return { status: "ready", sellerId: asset.sellerId, sku: asset.sku, buyerMessage: `Buyer ${buyerId} can receive ${asset.title}.` };
}

export async function scheduleRollout(taskUrl: string): Promise<string> {
  const result = await cron.create("0 * * * *", taskUrl);
  return result.job_id;
}

if (process.env.RUN_MARKETPLACE_DEMO === "1") {
  const result = await prepareHandoff({ sellerId: "seller-42", sku: "sku-7", title: "Canvas tote", priceCents: 2400 }, "buyer-9");
  console.log(JSON.stringify(result));
}
