import type { User, Role } from "@matrix-sharon/types";

export interface UserStore {
  upsertFromGithub(input: {
    id: string;
    githubId: number;
    name: string;
    email: string | null;
    avatarUrl: string | null;
    /** Role to assign when the user does not yet exist. Existing roles are preserved. */
    defaultRoleIfNew: Role;
  }): Promise<User>;

  findById(id: string): Promise<User | null>;
  findByGithubId(githubId: number): Promise<User | null>;
  list(): Promise<User[]>;
  setRole(id: string, role: Role): Promise<void>;
  touchLastSeen(id: string, at: number): Promise<void>;
}
