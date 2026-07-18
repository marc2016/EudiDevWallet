import { Dropdown } from 'primereact/dropdown';
import {
  CERTIFICATE_MODE_OPTIONS,
  CREDENTIAL_FORMAT_OPTIONS,
  RESPONSE_MODE_OPTIONS,
  saveCertificateMode,
  saveCredentialFormat,
  saveResponseMode,
} from '../settings/walletSettings';
import type { CertificateMode, CredentialFormatSetting, ResponseMode } from '../types/openid4vp';

export interface WalletSettingsProps {
  certificateMode: CertificateMode;
  responseMode: ResponseMode;
  credentialFormat: CredentialFormatSetting;
  onCertificateModeChange: (m: CertificateMode) => void;
  onResponseModeChange: (m: ResponseMode) => void;
  onCredentialFormatChange: (f: CredentialFormatSetting) => void;
}

export function WalletSettings({
  certificateMode,
  responseMode,
  credentialFormat,
  onCertificateModeChange,
  onResponseModeChange,
  onCredentialFormatChange,
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
  );
}
