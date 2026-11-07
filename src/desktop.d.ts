import type { DesktopAPI } from './model';

declare global {
  interface Window {
    desktop: DesktopAPI;
  }
}

export {};
