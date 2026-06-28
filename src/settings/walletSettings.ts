import type { CertificateMode, ResponseMode } from '../types/openid4vp';

const CERT_KEY = 'pew_certificate_mode';
const RESPONSE_KEY = 'pew_response_mode';

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
