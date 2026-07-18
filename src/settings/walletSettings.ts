import type { CertificateMode, CredentialFormatSetting, ResponseMode } from '../types/openid4vp';

const CERT_KEY = 'edw_certificate_mode';
const RESPONSE_KEY = 'edw_response_mode';
const CREDENTIAL_FORMAT_KEY = 'edw_credential_format';
const VIEW_KEY = 'edw_view_mode';
const COLOR_SCHEME_KEY = 'edw_color_scheme';
const CLEAR_LOG_ON_REQUEST_KEY = 'edw_clear_log_on_request';

export type ViewMode = 'simple' | 'debug';
export type ColorScheme = 'light' | 'dark';

export function loadClearLogOnRequest(): boolean {
  const v = localStorage.getItem(CLEAR_LOG_ON_REQUEST_KEY);
  if (v === null) return true;
  return v === 'true';
}

export function saveClearLogOnRequest(value: boolean): void {
  localStorage.setItem(CLEAR_LOG_ON_REQUEST_KEY, String(value));
}

export const CERTIFICATE_MODE_OPTIONS = [
  { label: 'Aus', value: 'off' as CertificateMode },
  { label: 'Anzeigen', value: 'display' as CertificateMode },
  { label: 'Weiche Prüfung', value: 'soft' as CertificateMode },
  { label: 'Strikte Prüfung', value: 'strict' as CertificateMode, disabled: true },
];

export const RESPONSE_MODE_OPTIONS = [
  { label: 'Auto', value: 'auto' as ResponseMode },
  { label: 'direct_post', value: 'direct_post' as ResponseMode },
  { label: 'direct_post.jwt', value: 'direct_post_jwt' as ResponseMode },
  { label: 'Raw JSON', value: 'raw_json' as ResponseMode },
];

export const CREDENTIAL_FORMAT_OPTIONS = [
  { label: 'Auto', value: 'auto' as CredentialFormatSetting },
  { label: 'SD-JWT (dc+sd-jwt)', value: 'dc_sd_jwt' as CredentialFormatSetting },
  { label: 'mdoc (mso_mdoc)', value: 'mso_mdoc' as CredentialFormatSetting },
];

export function loadCertificateMode(): CertificateMode {
  const v = localStorage.getItem(CERT_KEY);
  if (v === 'display' || v === 'soft' || v === 'strict') return v;
  return 'off';
}

export function saveCertificateMode(mode: CertificateMode): void {
  localStorage.setItem(CERT_KEY, mode);
}

export function loadResponseMode(): ResponseMode {
  const v = localStorage.getItem(RESPONSE_KEY);
  if (v === 'direct_post' || v === 'direct_post_jwt' || v === 'raw_json') return v;
  return 'auto';
}

export function saveResponseMode(mode: ResponseMode): void {
  localStorage.setItem(RESPONSE_KEY, mode);
}

export function loadCredentialFormat(): CredentialFormatSetting {
  const v = localStorage.getItem(CREDENTIAL_FORMAT_KEY);
  if (v === 'dc_sd_jwt' || v === 'mso_mdoc') return v;
  return 'auto';
}

export function saveCredentialFormat(format: CredentialFormatSetting): void {
  localStorage.setItem(CREDENTIAL_FORMAT_KEY, format);
}

export function loadViewMode(): ViewMode {
  const v = localStorage.getItem(VIEW_KEY);
  if (v === 'debug') return 'debug';
  return 'simple';
}

export function saveViewMode(mode: ViewMode): void {
  localStorage.setItem(VIEW_KEY, mode);
}

export function loadColorScheme(): ColorScheme {
  const v = localStorage.getItem(COLOR_SCHEME_KEY);
  if (v === 'dark') return 'dark';
  return 'light';
}

export function saveColorScheme(scheme: ColorScheme): void {
  localStorage.setItem(COLOR_SCHEME_KEY, scheme);
}

export function resolveResponseMode(
  setting: ResponseMode,
  requestResponseMode?: string,
): 'direct_post' | 'direct_post_jwt' | 'raw_json' {
  if (setting !== 'auto') {
    if (setting === 'direct_post_jwt') return 'direct_post_jwt';
    if (setting === 'raw_json') return 'raw_json';
    return 'direct_post';
  }
  if (requestResponseMode === 'direct_post.jwt') return 'direct_post_jwt';
  if (requestResponseMode === 'direct_post') return 'direct_post';
  return 'raw_json';
}
