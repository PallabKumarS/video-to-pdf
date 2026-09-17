export interface ElectronAPI {
  isElectron: boolean;
  checkCookies: () => Promise<{ hasCookies: boolean }>;
  saveCookies: (
    cookiesText: string,
  ) => Promise<{ success: boolean; error?: string }>;
  clearCookies: () => Promise<{ success: boolean }>;
  downloadYoutube: (url: string) => Promise<{
    success: boolean;
    data?: {
      filePath: string;
      streamUrl: string;
      title: string;
      duration: number;
    };
    error?: string;
  }>;
  loginGoogle: () => Promise<{
    success: boolean;
    count?: number;
    error?: string;
  }>;
  onDownloadProgress: (
    callback: (progress: {
      percent: number;
      speed: string;
      eta: string;
    }) => void,
  ) => () => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
