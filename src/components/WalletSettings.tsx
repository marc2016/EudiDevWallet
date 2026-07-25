import { Dropdown } from 'primereact/dropdown';
import { Checkbox } from 'primereact/checkbox';
import { InputText } from 'primereact/inputtext';
import {
  CERTIFICATE_MODE_OPTIONS,
  CREDENTIAL_FORMAT_OPTIONS,
  RESPONSE_MODE_OPTIONS,
  TRUST_ANCHOR_MODE_OPTIONS,
  saveCertificateMode,
  saveCredentialFormat,
  saveCustomTrustAnchors,
  saveResponseMode,
  saveSimulateOneTimeUse,
  saveTrustAnchorMode,
} from '../settings/walletSettings';
import type { CertificateMode, CredentialFormatSetting, ResponseMode, TrustAnchorMode } from '../types/openid4vp';

export interface WalletSettingsProps {
  certificateMode: CertificateMode;
  trustAnchorMode?: TrustAnchorMode;
  customTrustAnchors?: string;
  responseMode: ResponseMode;
  credentialFormat: CredentialFormatSetting;
  simulateOneTimeUse: boolean;
  onCertificateModeChange: (m: CertificateMode) => void;
  onTrustAnchorModeChange?: (m: TrustAnchorMode) => void;
  onCustomTrustAnchorsChange?: (v: string) => void;
  onResponseModeChange: (m: ResponseMode) => void;
  onCredentialFormatChange: (f: CredentialFormatSetting) => void;
  onSimulateOneTimeUseChange: (v: boolean) => void;
}

export function WalletSettings({
  certificateMode,
  trustAnchorMode = 'eudi_ca',
  customTrustAnchors = '',
  responseMode,
  credentialFormat,
  simulateOneTimeUse,
  onCertificateModeChange,
  onTrustAnchorModeChange,
  onCustomTrustAnchorsChange,
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
          <label className="text-sm font-medium text-color-secondary" htmlFor="trust-anchor-mode">
            Trust Anchor
          </label>
          <Dropdown
            inputId="trust-anchor-mode"
            value={trustAnchorMode}
            options={TRUST_ANCHOR_MODE_OPTIONS}
            optionLabel="label"
            optionValue="value"
            onChange={(e) => {
              if (e.value) {
                saveTrustAnchorMode(e.value);
                onTrustAnchorModeChange?.(e.value);
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

      {trustAnchorMode === 'custom' && (
        <div className="wallet-settings-group w-full px-1">
          <label className="text-sm font-medium text-color-secondary" htmlFor="custom-trust-anchors">
            Benutzerdefinierte Trust Anchors / CAs (kommagetrennt)
          </label>
          <InputText
            id="custom-trust-anchors"
            value={customTrustAnchors}
            placeholder="z. B. Relying Party Registrar, My Test Root CA"
            onChange={(e) => {
              const val = e.target.value;
              saveCustomTrustAnchors(val);
              onCustomTrustAnchorsChange?.(val);
            }}
            className="w-full text-sm mt-1"
          />
        </div>
      )}

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
