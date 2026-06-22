/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

declare module "html5-qrcode" {
  export class Html5Qrcode {
    constructor(elementId: string);
    start(
      cameraId: string,
      config: { fps: number; qrbox?: { width: number; height: number } },
      onScanSuccess: (decodedText: string) => void,
      onScanFailure?: (error: string) => void
    ): Promise<void>;
    stop(): Promise<void>;
    clear(): void;
    static getCameras(): Promise<Array<{ id: string; label: string }>>;
  }
}
