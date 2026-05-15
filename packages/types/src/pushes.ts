import { z } from "zod";
import { PushKindIdSchema } from "./push-kinds.js";

export const PushReceiptStatusSchema = z.enum([
  "pending", "installed", "failed", "uninstalled",
]);
export type PushReceiptStatus = z.infer<typeof PushReceiptStatusSchema>;

export const PushSchema = z.object({
  id: z.string(),
  kind: PushKindIdSchema,
  skillSlug: z.string(),
  skillVersionId: z.string().nullable(),
  fromLeaderId: z.string(),
  reason: z.string(),
  pushedAt: z.number().int(),
});
export type Push = z.infer<typeof PushSchema>;

export const PushReceiptSchema = z.object({
  pushId: z.string(),
  recipientId: z.string(),
  status: PushReceiptStatusSchema,
  statusChangedAt: z.number().int(),
  failReason: z.string().nullable(),
  acknowledged: z.boolean(),
});
export type PushReceipt = z.infer<typeof PushReceiptSchema>;
