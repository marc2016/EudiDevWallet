import { Dropdown } from 'primereact/dropdown';
import { Checkbox } from 'primereact/checkbox';
import {
  CERTIFICATE_MODE_OPTIONS,
  CREDENTIAL_FORMAT_OPTIONS,
  RESPONSE_MODE_OPTIONS,
  saveCertificateMode,
  saveCredentialFormat,
  saveResponseMode,
  saveSimulateOneTimeUse,
} from '../settings/walletSettings';
import type { CertificateMode, CredentialFormatSetting, ResponseMode } from '../types/openid4vp';

export interface WalletSettingsProps {
  certificateMode: CertificateMode;
  responseMode: ResponseMode;
  credentialFormat: CredentialFormatSetting;
  simulateOneTimeUse: boolean;
  onCertificateModeChange: (m: CertificateMode) => void;
  onResponseModeChange: (m: ResponseMode) => void;
  onCredentialFormatChange: (f: CredentialFormatSetting) => void;
  onSimulateOneTimeUseChange: (v: boolean) => void;
}

export function WalletSettings({
  certificateMode,
  responseMode,
  credentialFormat,
  simulateOneTimeUse,
  onCertificateModeChange,
  onResponseModeChange,
  onCredentialFormatChange,
  onSimulateOneTimeUseChange,
}: WalletSettingsProps) {
  const certOptions = CERTIFICATE_MODE_OPTIONS.map((o) => ({
    label: o.label,
    value: o.value,
    disabled: 'disabled' in o ? o.disabled : false,
  }));

  return (
    <div className="flex flex-column gap-3 w-full">
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
            Transport
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
        <div className="wallet-settings-group">
          <label className="text-sm font-medium text-color-secondary" htmlFor="credential-format">
            Credential-Format
          </label>
          <Dropdown
            inputId="credential-format"
            value={credentialFormat}
            options={CREDENTIAL_FORMAT_OPTIONS}
            optionLabel="label"
            optionValue="value"
            onChange={(e) => {
              if (e.value) {
                saveCredentialFormat(e.value);
                onCredentialFormatChange(e.value);
              }
            }}
            className="w-full settings-dropdown"
          />
        </div>
      </div>
      <div className="flex align-items-center gap-2 px-1 mb-1">
        <Checkbox
          inputId="simulate-otu"
          checked={simulateOneTimeUse}
          onChange={(e) => {
            const val = Boolean(e.checked);
            saveSimulateOneTimeUse(val);
            onSimulateOneTimeUseChange(val);
          }}
        />
        <label htmlFor="simulate-otu" className="text-sm font-medium select-none cursor-pointer text-color-secondary">
          Einmalnutzung simulieren (One-Time-Use)
        </label>
      </div>
    </div>
  );
}
