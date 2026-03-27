export type ThemeMode = "dark" | "light" | "system";

export interface AppSettings {
  locale: string;
  theme: ThemeMode;
  fontSize: number;
  fontFamily: string;
  sidebarWidth: number;
  sidebarVisible: boolean;
}
