import type { PendingSubmission, SubmissionStatus } from "@matrix-sharon/types";

export interface SubmissionStore {
  insert(submission: PendingSubmission): Promise<void>;
  find(id: string): Promise<PendingSubmission | null>;
  listByStatus(status: SubmissionStatus): Promise<PendingSubmission[]>;
  listBySubmitter(submitterId: string): Promise<PendingSubmission[]>;
  setStatus(id: string, params: {
    status: Exclude<SubmissionStatus, "pending">;
    reviewerId: string;
    reviewedAt: number;
    rejectReason: string | null;
  }): Promise<void>;
  // Atomic conditional transition — only flips if status is still 'pending'.
  // Returns true on success, false when the row was already reviewed by
  // someone else (or doesn't exist). Side-effect-free callers should prefer
  // this over setStatus to make approve/reject idempotent.
  transitionFromPending(id: string, params: {
    status: Exclude<SubmissionStatus, "pending">;
    reviewerId: string;
    reviewedAt: number;
    rejectReason: string | null;
  }): Promise<boolean>;
}
