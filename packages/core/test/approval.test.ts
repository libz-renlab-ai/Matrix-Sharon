import { describe, it, expect } from "vitest";
import {
  planApproval,
  planRejection,
  ApprovalPlanError,
} from "../src/approval.js";
import type { PendingSubmission, User } from "@matrix-sharon/types";

const leader: User = {
  id: "leader-one",
  githubId: 1,
  name: "Leader",
  email: null,
  avatarUrl: null,
  role: "leader",
  createdAt: 0,
  lastSeenAt: null,
};

const member: User = { ...leader, id: "octocat", githubId: 2, role: "member" };

const pendingSub: PendingSubmission = {
  id: "sub-1",
  skillSlug: "sql-safety-gate",
  isNewSkill: true,
  bundleSha256: "sha-1",
  bundleSize: 100,
  rawSkillMd: `---\nname: sql-safety-gate\ndescription: x\n---\nbody`,
  submitterId: "octocat",
  submittedAt: 1000,
  status: "pending",
  reviewerId: null,
  reviewedAt: null,
  rejectReason: null,
};

describe("planApproval", () => {
  it("returns versionToInsert with allocated semver and status change", () => {
    const plan = planApproval({
      submission: pendingSub,
      leader,
      nowMs: 2000,
      maxSemver: 0,
      bundleSha256: "computed-sha",
      bundleSize: 123,
      versionId: "01JABCDEFNEWVERSIONXYZAAAA",
      note: "lgtm",
    });
    expect(plan.versionToInsert.skillSlug).toBe("sql-safety-gate");
    expect(plan.versionToInsert.semver).toBe(1);
    expect(plan.versionToInsert.bundleSha256).toBe("computed-sha");
    expect(plan.versionToInsert.publishedBy).toBe("octocat");
    expect(plan.versionToInsert.approvedBy).toBe("leader-one");
    expect(plan.versionToInsert.note).toBe("lgtm");

    expect(plan.statusChange).toEqual({
      status: "approved",
      reviewerId: "leader-one",
      reviewedAt: 2000,
      rejectReason: null,
    });

    expect(plan.auditEntry.action).toBe("approve");
    expect(plan.auditEntry.actorId).toBe("leader-one");
    expect(plan.auditEntry.targetId).toBe("sub-1");
  });

  it("bumps semver based on maxSemver", () => {
    const plan = planApproval({
      submission: pendingSub,
      leader,
      nowMs: 2000,
      maxSemver: 7,
      bundleSha256: "x",
      bundleSize: 0,
      versionId: "01JNEWVERSIONHHHHHHHHHHHHHH",
    });
    expect(plan.versionToInsert.semver).toBe(8);
  });

  it("throws when actor is not a leader", () => {
    expect(() =>
      planApproval({
        submission: pendingSub,
        leader: member,
        nowMs: 2000,
        maxSemver: 0,
        bundleSha256: "x",
        bundleSize: 0,
        versionId: "v",
      })
    ).toThrow(ApprovalPlanError);
  });

  it("throws when submission is not pending", () => {
    expect(() =>
      planApproval({
        submission: { ...pendingSub, status: "approved" },
        leader,
        nowMs: 2000,
        maxSemver: 0,
        bundleSha256: "x",
        bundleSize: 0,
        versionId: "v",
      })
    ).toThrow(ApprovalPlanError);
  });

  it("copies pain/gain/triggers from frontmatter when present", () => {
    const md = `---\nname: x\ndescription: d\npain: P\ngain: G\ntriggers: T\n---\nbody`;
    const plan = planApproval({
      submission: { ...pendingSub, rawSkillMd: md, skillSlug: "x" },
      leader,
      nowMs: 2000,
      maxSemver: 0,
      bundleSha256: "x",
      bundleSize: 0,
      versionId: "v",
    });
    expect(plan.versionToInsert.pain).toBe("P");
    expect(plan.versionToInsert.gain).toBe("G");
    expect(plan.versionToInsert.triggers).toBe("T");
  });
});

describe("planRejection", () => {
  it("returns status change + audit entry with reason", () => {
    const plan = planRejection({
      submission: pendingSub,
      leader,
      nowMs: 3000,
      reason: "缺 pain 字段",
    });
    expect(plan.statusChange).toEqual({
      status: "rejected",
      reviewerId: "leader-one",
      reviewedAt: 3000,
      rejectReason: "缺 pain 字段",
    });
    expect(plan.auditEntry.action).toBe("reject");
    expect((plan.auditEntry.payload as { reason: string }).reason).toBe("缺 pain 字段");
  });

  it("throws when reason is empty", () => {
    expect(() =>
      planRejection({ submission: pendingSub, leader, nowMs: 0, reason: "" })
    ).toThrow(ApprovalPlanError);
  });

  it("throws when actor is not leader", () => {
    expect(() =>
      planRejection({ submission: pendingSub, leader: member, nowMs: 0, reason: "x" })
    ).toThrow(ApprovalPlanError);
  });

  it("throws when submission is not pending", () => {
    expect(() =>
      planRejection({
        submission: { ...pendingSub, status: "rejected" },
        leader,
        nowMs: 0,
        reason: "x",
      })
    ).toThrow(ApprovalPlanError);
  });
});
