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
}
