export interface AuditLog {
  record(entry: {
    actorId: string;
    action: string;
    targetKind: string | null;
    targetId: string | null;
    payload: unknown;
    at: number;
  }): Promise<void>;

  list(filter?: {
    actorId?: string;
    action?: string;
    sinceMs?: number;
    untilMs?: number;
    limit?: number;
  }): Promise<Array<{ id: number; [k: string]: unknown }>>;
}
