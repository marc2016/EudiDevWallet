import { SelectButton } from 'primereact/selectbutton';
import type { ColorScheme, ViewMode } from '../settings/walletSettings';
import { useTranslation, type Language } from '../i18n/LanguageContext';

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
  const { language, setLanguage, t } = useTranslation();

  const VIEW_OPTIONS = [
    { label: t('toolbar.simple'), value: 'simple' as ViewMode },
    { label: t('toolbar.debug'), value: 'debug' as ViewMode },
  ];

  const THEME_OPTIONS = [
    { label: t('toolbar.light'), value: 'light' as ColorScheme, icon: 'pi pi-sun' },
    { label: t('toolbar.dark'), value: 'dark' as ColorScheme, icon: 'pi pi-moon' },
  ];

  const LANG_OPTIONS = [
    { label: 'DE', value: 'de' as Language },
    { label: 'EN', value: 'en' as Language },
  ];

  return (
    <div className="app-toolbar flex items-center gap-2">
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
      <SelectButton
        value={language}
        options={LANG_OPTIONS}
        onChange={(e) => {
          if (e.value) setLanguage(e.value);
        }}
        allowEmpty={false}
        className="app-toolbar-select app-toolbar-lang"
      />
    </div>
  );
}
