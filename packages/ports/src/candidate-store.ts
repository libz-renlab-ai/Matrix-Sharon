import type { Candidate } from "@matrix-sharon/types";

export interface CandidateStore {
  upsert(candidate: Candidate): Promise<void>;
  listForUser(userId: string, opts?: { includeDismissed?: boolean }): Promise<Candidate[]>;
  find(id: string): Promise<Candidate | null>;
  dismiss(id: string): Promise<void>;
  delete(id: string): Promise<void>;
}
