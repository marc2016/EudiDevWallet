import { SelectButton } from 'primereact/selectbutton';
import type { ColorScheme, ViewMode } from '../settings/walletSettings';

const VIEW_OPTIONS = [
  { label: 'Einfach', value: 'simple' as ViewMode },
  { label: 'Debug', value: 'debug' as ViewMode },
];

const THEME_OPTIONS = [
  { label: 'Light', value: 'light' as ColorScheme, icon: 'pi pi-sun' },
  { label: 'Dark', value: 'dark' as ColorScheme, icon: 'pi pi-moon' },
];

interface AppToolbarProps {
  viewMode: ViewMode;
  colorScheme: ColorScheme;
  onViewModeChange: (mode: ViewMode) => void;
  onColorSchemeChange: (scheme: ColorScheme) => void;
}

export function AppToolbar({
  viewMode,
  colorScheme,
  onViewModeChange,
  onColorSchemeChange,
}: AppToolbarProps) {
  return (
    <div className="app-toolbar">
      <SelectButton
        value={viewMode}
        options={VIEW_OPTIONS}
        onChange={(e) => {
          if (e.value) onViewModeChange(e.value);
        }}
        allowEmpty={false}
        className="app-toolbar-select"
      />
      <SelectButton
        value={colorScheme}
        options={THEME_OPTIONS}
        onChange={(e) => {
          if (e.value) onColorSchemeChange(e.value);
        }}
        optionLabel="label"
        itemTemplate={(option) => (
          <i className={option.icon} aria-label={option.label} title={option.label} />
        )}
        allowEmpty={false}
        className="app-toolbar-select app-toolbar-theme"
      />
    </div>
  );
}
