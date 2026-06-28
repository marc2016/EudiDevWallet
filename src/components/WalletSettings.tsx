import { Card } from 'primereact/card';
import { SelectButton } from 'primereact/selectbutton';
import {
  CERTIFICATE_MODE_OPTIONS,
  RESPONSE_MODE_OPTIONS,
  saveCertificateMode,
  saveResponseMode,
} from '../settings/walletSettings';
import type { CertificateMode, ResponseMode } from '../types/openid4vp';
import { useActivityLog } from '../log/ActivityLogContext';

interface WalletSettingsProps {
  certificateMode: CertificateMode;
  responseMode: ResponseMode;
  onCertificateModeChange: (m: CertificateMode) => void;
  onResponseModeChange: (m: ResponseMode) => void;
}

export function WalletSettings({
  certificateMode,
  responseMode,
  onCertificateModeChange,
  onResponseModeChange,
}: WalletSettingsProps) {
  const { log } = useActivityLog();

  const certOptions = CERTIFICATE_MODE_OPTIONS.map((o) => ({
    label: o.label,
    value: o.value,
    disabled: 'disabled' in o ? o.disabled : false,
  }));

  return (
    <Card title="Einstellungen" className="mb-2">
      <div className="flex flex-column gap-3">
        <div className="flex flex-column gap-2">
          <span className="text-sm font-medium text-color-secondary">Zertifikatsmodus</span>
          <SelectButton
            value={certificateMode}
            options={certOptions}
            onChange={(e) => {
              if (e.value) {
                saveCertificateMode(e.value);
                onCertificateModeChange(e.value);
                log('info', 'settings', `Zertifikatsmodus: ${e.value}`);
              }
            }}
            className="settings-select"
          />
        </div>
        <div className="flex flex-column gap-2">
          <span className="text-sm font-medium text-color-secondary">Antwortformat</span>
          <SelectButton
            value={responseMode}
            options={RESPONSE_MODE_OPTIONS}
            onChange={(e) => {
              if (e.value) {
                saveResponseMode(e.value);
                onResponseModeChange(e.value);
                log('info', 'settings', `Antwortformat: ${e.value}`);
              }
            }}
            className="settings-select"
          />
        </div>
      </div>
    </Card>
  );
}
