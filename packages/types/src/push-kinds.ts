import { z } from "zod";

export const PushKindIdSchema = z.enum([
  "skill",
  "viki-rule",
  "workflow",
  "prompt-template",
]);
export type PushKindId = z.infer<typeof PushKindIdSchema>;

/** Where the receiver-side dispatcher puts the payload for a given kind. */
export type PushKindHandler =
  | { type: "fs-extract";    targetDir: string }   // extract bundle.tgz to dir
  | { type: "fs-write-file"; targetPath: string }  // write single file
  | { type: "delegate-cli";  cmd: string };        // invoke external CLI

export interface PushKindDef {
  id: PushKindId;
  label: string;
  icon: string;
  available: boolean;
  desc: string;
  handler: PushKindHandler;
  eta?: string;
}

/**
 * Push types registry. Adding a new kind = adding one entry here +
 * implementing the corresponding handler dispatch in the receiver-side
 * sharon CLI dispatcher. v1 ships only `skill` as `available: true`.
 *
 * Viki integration boundary: kind=viki-rule delegates to `viki import-rules`
 * — Sharon does not need to know what's inside the bundle.
 */
export const PUSH_KINDS: Record<PushKindId, PushKindDef> = {
  "skill": {
    id: "skill",
    label: "Skill",
    icon: "🧩",
    available: true,
    desc: "Claude Code 原生 skill 目录",
    handler: { type: "fs-extract", targetDir: "~/.claude/skills/{name}/" },
  },
  "viki-rule": {
    id: "viki-rule",
    label: "Viki 规则",
    icon: "📐",
    available: false,
    eta: "v1.1",
    desc: "Viki 学习引擎抽出的规则包",
    handler: { type: "delegate-cli", cmd: "viki import-rules {bundle}" },
  },
  "workflow": {
    id: "workflow",
    label: "Workflow",
    icon: "🔗",
    available: false,
    eta: "v1.2",
    desc: "多步 skill 串联的 workflow 定义",
    handler: { type: "fs-extract", targetDir: "~/.claude/workflows/{name}/" },
  },
  "prompt-template": {
    id: "prompt-template",
    label: "Prompt 模板",
    icon: "💬",
    available: false,
    eta: "v1.3",
    desc: "可重用的 prompt 模板（带参数占位）",
    handler: { type: "fs-write-file", targetPath: "~/.claude/prompts/{name}.md" },
  },
};
