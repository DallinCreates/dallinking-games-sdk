export interface DallinSdkUser {
  isLoggedIn: boolean;
  username: string | null;
  userId: string | null;
}

export interface DallinSdk {
  readonly isEmbedded: boolean;

  getSaveData(): Promise<string | null>;
  saveData(data: string): Promise<void>;
  getUser(): Promise<DallinSdkUser>;
  getLanguage(): Promise<string>;
  showAd(): Promise<{ watched: boolean }>;
  openLink(url: string): Promise<{ opened: boolean }>;
  requestFullscreen(): Promise<{ granted: boolean }>;
  requestTheaterMode(): Promise<{ granted: boolean }>;
  exportSave(): Promise<{ exported: boolean }>;
  triggerShare(shareText: string): Promise<{ shared: boolean }>;

  updateProgress(percentage: number): void;
  gameReady(): void;
  fatalError(message: string): void;

  onPauseRequest(callback: () => void): () => void;
  onMuteRequest(callback: () => void): () => void;
  onUnmuteRequest(callback: () => void): () => void;
  onFocusLost(callback: () => void): () => void;
  onImportSave(callback: (data: string | null) => void): () => void;
}

export const DallinSdk: DallinSdk;
export default DallinSdk;
