import type { Install, InstallToken } from "@matrix-sharon/types";

export interface InstallStore {
  recordInstall(install: Install): Promise<void>;
  markUninstalled(userId: string, skillSlug: string, at: number): Promise<void>;
  listForUser(userId: string): Promise<Install[]>;

  putToken(token: InstallToken): Promise<void>;
  consumeToken(token: string, at: number): Promise<InstallToken | null>;
}
