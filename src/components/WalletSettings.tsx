import { Dropdown } from 'primereact/dropdown';
import {
  CERTIFICATE_MODE_OPTIONS,
  RESPONSE_MODE_OPTIONS,
  saveCertificateMode,
  saveResponseMode,
} from '../settings/walletSettings';
import type { CertificateMode, ResponseMode } from '../types/openid4vp';

export interface WalletSettingsProps {
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
  const certOptions = CERTIFICATE_MODE_OPTIONS.map((o) => ({
    label: o.label,
    value: o.value,
    disabled: 'disabled' in o ? o.disabled : false,
  }));

  return (
    <div className="wallet-settings-row">
      <div className="wallet-settings-group">
        <label className="text-sm font-medium text-color-secondary" htmlFor="cert-mode">
          Zertifikatsmodus
        </label>
        <Dropdown
          inputId="cert-mode"
          value={certificateMode}
          options={certOptions}
          optionLabel="label"
          optionValue="value"
          optionDisabled="disabled"
          onChange={(e) => {
            if (e.value) {
              saveCertificateMode(e.value);
              onCertificateModeChange(e.value);
            }
          }}
          className="w-full settings-dropdown"
        />
      </div>
      <div className="wallet-settings-group">
        <label className="text-sm font-medium text-color-secondary" htmlFor="response-mode">
          Antwortformat
        </label>
        <Dropdown
          inputId="response-mode"
          value={responseMode}
          options={RESPONSE_MODE_OPTIONS}
          optionLabel="label"
          optionValue="value"
          onChange={(e) => {
            if (e.value) {
              saveResponseMode(e.value);
              onResponseModeChange(e.value);
            }
          }}
          className="w-full settings-dropdown"
        />
      </div>
    </div>
  );
}
