import type { Push, PushReceipt, PushReceiptStatus } from "@matrix-sharon/types";

export interface PushStore {
  insertPush(push: Push): Promise<void>;
  insertReceipts(receipts: PushReceipt[]): Promise<void>;
  findPush(id: string): Promise<Push | null>;
  listReceiptsForPush(pushId: string): Promise<PushReceipt[]>;
  listInboxFor(recipientId: string): Promise<Array<{ push: Push; receipt: PushReceipt }>>;
  setReceiptStatus(pushId: string, recipientId: string, params: {
    status: PushReceiptStatus;
    statusChangedAt: number;
    failReason: string | null;
  }): Promise<void>;
  acknowledge(pushId: string, recipientId: string): Promise<void>;
}
