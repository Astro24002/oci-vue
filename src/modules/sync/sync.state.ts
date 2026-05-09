export type RegistrySyncStatus = {
  registryId: string;
  success: boolean;
  lastSyncAt: string;
  durationMs: number;
  errorMessage?: string;
};

export class SyncState {
  private readonly byRegistry = new Map<string, RegistrySyncStatus>();

  set(status: RegistrySyncStatus): void {
    this.byRegistry.set(status.registryId, status);
  }

  list(): RegistrySyncStatus[] {
    return [...this.byRegistry.values()];
  }
}
