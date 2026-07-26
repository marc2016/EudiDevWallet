import { Dropdown } from 'primereact/dropdown';
import { Checkbox } from 'primereact/checkbox';
import { InputText } from 'primereact/inputtext';
import {
  saveCertificateMode,
  saveCredentialFormat,
  saveCustomTrustAnchors,
  saveResponseMode,
  saveSimulateOneTimeUse,
  saveTrustAnchorMode,
} from '../settings/walletSettings';
import type { CertificateMode, CredentialFormatSetting, ResponseMode, TrustAnchorMode } from '../types/openid4vp';
import { useTranslation } from '../i18n/LanguageContext';

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
  const { t } = useTranslation();

  const certOptions = [
    { label: t('settings.cert.off'), value: 'off' },
    { label: t('settings.cert.display'), value: 'display' },
    { label: t('settings.cert.soft'), value: 'soft' },
    { label: t('settings.cert.strict'), value: 'strict' },
  ];

  const trustAnchorOptions = [
    { label: t('settings.trust.eudi_ca'), value: 'eudi_ca' },
    { label: t('settings.trust.custom'), value: 'custom' },
    { label: t('settings.trust.mock'), value: 'mock' },
  ];

  const responseModeOptions = [
    { label: t('settings.transport.auto'), value: 'auto' },
    { label: t('settings.transport.direct_post'), value: 'direct_post' },
    { label: t('settings.transport.direct_post_jwt'), value: 'direct_post_jwt' },
    { label: t('settings.transport.raw_json'), value: 'raw_json' },
  ];

  const formatOptions = [
    { label: t('settings.format.auto'), value: 'auto' },
    { label: t('settings.format.dc_sd_jwt'), value: 'dc_sd_jwt' },
    { label: t('settings.format.mso_mdoc'), value: 'mso_mdoc' },
  ];

  return (
    <div className="flex flex-column gap-3 w-full">
      <div className="wallet-settings-row">
        <div className="wallet-settings-group">
          <label className="text-sm font-medium text-color-secondary" htmlFor="cert-mode">
            {t('settings.certificateMode')}
          </label>
          <Dropdown
            inputId="cert-mode"
            value={certificateMode}
            options={certOptions}
            optionLabel="label"
            optionValue="value"
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
            {t('settings.trustAnchor')}
          </label>
          <Dropdown
            inputId="trust-anchor-mode"
            value={trustAnchorMode}
            options={trustAnchorOptions}
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
            {t('settings.transport')}
          </label>
          <Dropdown
            inputId="response-mode"
            value={responseMode}
            options={responseModeOptions}
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
            {t('settings.credentialFormat')}
          </label>
          <Dropdown
            inputId="credential-format"
            value={credentialFormat}
            options={formatOptions}
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
            {t('settings.customTrustAnchorsLabel')}
          </label>
          <InputText
            id="custom-trust-anchors"
            value={customTrustAnchors}
            placeholder={t('settings.customTrustAnchorsPlaceholder')}
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
          {t('settings.simulateOneTimeUse')}
        </label>
      </div>
    </div>
  );
}
