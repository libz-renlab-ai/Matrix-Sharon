import type { PendingSubmission, SkillVersion, User } from "@matrix-sharon/types";
import { parseFrontmatter } from "./frontmatter.js";
import { nextSemver } from "./semver-alloc.js";

export class ApprovalPlanError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApprovalPlanError";
  }
}

export interface AuditEntry {
  actorId: string;
  action: "approve" | "reject";
  targetKind: "submission";
  targetId: string;
  payload: unknown;
  at: number;
}

export interface StatusChange {
  status: "approved" | "rejected";
  reviewerId: string;
  reviewedAt: number;
  rejectReason: string | null;
}

export interface ApprovalPlan {
  versionToInsert: SkillVersion;
  statusChange: StatusChange;
  auditEntry: AuditEntry;
}

export interface RejectionPlan {
  statusChange: StatusChange;
  auditEntry: AuditEntry;
}

export function planApproval(input: {
  submission: PendingSubmission;
  leader: User;
  nowMs: number;
  maxSemver: number;
  bundleSha256: string;
  bundleSize: number;
  versionId: string;
  note?: string;
}): ApprovalPlan {
  if (input.leader.role !== "leader") {
    throw new ApprovalPlanError(`actor ${input.leader.id} is not a leader`);
  }
  if (input.submission.status !== "pending") {
    throw new ApprovalPlanError(
      `submission ${input.submission.id} is not pending (status=${input.submission.status})`
    );
  }

  const { frontmatter } = parseFrontmatter(input.submission.rawSkillMd);
  const semver = nextSemver(input.maxSemver);

  const versionToInsert: SkillVersion = {
    id: input.versionId,
    skillSlug: input.submission.skillSlug,
    semver,
    bundleSha256: input.bundleSha256,
    bundleSize: input.bundleSize,
    description: frontmatter.description,
    pain: frontmatter.pain ?? null,
    gain: frontmatter.gain ?? null,
    triggers: frontmatter.triggers ?? null,
    exampleJson: frontmatter.example ? JSON.stringify(frontmatter.example) : null,
    readmeMd: input.submission.rawSkillMd,
    note: input.note ?? null,
    publishedBy: input.submission.submitterId,
    approvedBy: input.leader.id,
    approvedAt: input.nowMs,
    publishedAt: input.nowMs,
  };

  const statusChange: StatusChange = {
    status: "approved",
    reviewerId: input.leader.id,
    reviewedAt: input.nowMs,
    rejectReason: null,
  };

  const auditEntry: AuditEntry = {
    actorId: input.leader.id,
    action: "approve",
    targetKind: "submission",
    targetId: input.submission.id,
    payload: {
      skillSlug: input.submission.skillSlug,
      semver,
      versionId: input.versionId,
      note: input.note ?? null,
    },
    at: input.nowMs,
  };

  return { versionToInsert, statusChange, auditEntry };
}

export function planRejection(input: {
  submission: PendingSubmission;
  leader: User;
  nowMs: number;
  reason: string;
}): RejectionPlan {
  if (input.leader.role !== "leader") {
    throw new ApprovalPlanError(`actor ${input.leader.id} is not a leader`);
  }
  if (input.submission.status !== "pending") {
    throw new ApprovalPlanError(
      `submission ${input.submission.id} is not pending (status=${input.submission.status})`
    );
  }
  if (input.reason.trim().length === 0) {
    throw new ApprovalPlanError("rejection reason is required");
  }

  const statusChange: StatusChange = {
    status: "rejected",
    reviewerId: input.leader.id,
    reviewedAt: input.nowMs,
    rejectReason: input.reason,
  };
  const auditEntry: AuditEntry = {
    actorId: input.leader.id,
    action: "reject",
    targetKind: "submission",
    targetId: input.submission.id,
    payload: { reason: input.reason, skillSlug: input.submission.skillSlug },
    at: input.nowMs,
  };

  return { statusChange, auditEntry };
}
