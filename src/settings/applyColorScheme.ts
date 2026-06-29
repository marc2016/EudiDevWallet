import lightThemeUrl from 'primereact/resources/themes/lara-light-blue/theme.css?url';
import darkThemeUrl from 'primereact/resources/themes/lara-dark-blue/theme.css?url';
import type { ColorScheme } from './walletSettings';

const THEME_LINK_ID = 'app-theme';

export function applyColorScheme(scheme: ColorScheme): void {
  const link = document.getElementById(THEME_LINK_ID) as HTMLLinkElement | null;
  if (link) {
    link.href = scheme === 'dark' ? darkThemeUrl : lightThemeUrl;
  }
  document.documentElement.dataset.theme = scheme;
}
