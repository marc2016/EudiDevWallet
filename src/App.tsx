import { useRef, useState } from 'react';
import { Toast } from 'primereact/toast';
import { AppToolbar } from './components/AppToolbar';
import { DebugView } from './components/DebugView';
import { SimpleView } from './components/SimpleView';
import { ActivityLogProvider } from './log/ActivityLogContext';
import { useWalletFlow } from './hooks/useWalletFlow';
import { applyColorScheme } from './settings/applyColorScheme';
import {
  loadColorScheme,
  loadViewMode,
  saveColorScheme,
  saveViewMode,
  type ColorScheme,
  type ViewMode,
} from './settings/walletSettings';

function AppContent() {
  const toast = useRef<Toast>(null);
  const [viewMode, setViewMode] = useState<ViewMode>(loadViewMode);
  const [colorScheme, setColorScheme] = useState<ColorScheme>(loadColorScheme);

  const flow = useWalletFlow({
    toast,
    toastMode: viewMode === 'simple' ? 'errors-only' : 'all',
  });

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    saveViewMode(mode);
  };

  const handleColorSchemeChange = (scheme: ColorScheme) => {
    setColorScheme(scheme);
    saveColorScheme(scheme);
    applyColorScheme(scheme);
  };

  return (
    <>
      <AppToolbar
        viewMode={viewMode}
        colorScheme={colorScheme}
        onViewModeChange={handleViewModeChange}
        onColorSchemeChange={handleColorSchemeChange}
      />
      {viewMode === 'simple' ? <SimpleView flow={flow} /> : <DebugView flow={flow} toast={toast} />}
    </>
  );
}

export default function App() {
  return (
    <ActivityLogProvider>
      <AppContent />
    </ActivityLogProvider>
  );
}
