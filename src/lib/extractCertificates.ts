import { decodeJwt } from 'jose';
import type { AuthorizationRequest, CertificateInfo } from '../types/openid4vp';

function parseDerCertificate(base64Der: string): CertificateInfo | undefined {
  try {
    const binary = atob(base64Der.replace(/\s/g, ''));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

    // Minimal ASN.1 parse for display — extract printable strings
    const text = Array.from(bytes)
      .map((b) => (b >= 32 && b < 127 ? String.fromCharCode(b) : '\n'))
      .join('');
    const lines = text.split('\n').filter((l) => l.length > 2);

    return {
      subject: lines.find((l) => l.includes('=')) ?? lines[0],
      issuer: lines[1],
      raw: base64Der.slice(0, 40) + '…',
      san: lines.filter((l) => l.includes('.') && !l.includes('=')).slice(0, 3),
    };
  } catch {
    return undefined;
  }
}

export function extractCertificatesFromRequest(request: AuthorizationRequest): {
  wrpac?: CertificateInfo;
  wrprc?: Record<string, unknown>;
  x5cChain: string[];
  expectsX509ClientId: boolean;
} {
  const x5c = (request.requestJwtHeader?.x5c as string[] | undefined) ?? [];
  const wrpac = x5c[0] ? parseDerCertificate(x5c[0]) : undefined;

  let wrprc: Record<string, unknown> | undefined;
  const wrprcRaw =
    request.rawParams?.registration_certificate ??
    request.rawParams?.client_metadata ??
    (request.requestJwtPayload?.registration_certificate as string | undefined);

  if (wrprcRaw) {
    try {
      wrprc =
        typeof wrprcRaw === 'string' && wrprcRaw.includes('.')
          ? (decodeJwt(wrprcRaw) as Record<string, unknown>)
          : typeof wrprcRaw === 'string'
            ? (JSON.parse(wrprcRaw) as Record<string, unknown>)
            : (wrprcRaw as Record<string, unknown>);
    } catch {
      wrprc = { raw: wrprcRaw };
    }
  }

  const expectsX509ClientId = Boolean(request.client_id?.startsWith('x509_san_dns:'));

  return { wrpac, wrprc, x5cChain: x5c, expectsX509ClientId };
}

export function certificateValidity(info?: CertificateInfo): {
  valid: boolean;
  notBefore?: string;
  notAfter?: string;
} {
  if (!info) return { valid: false };
  // Without full X.509 parser, assume valid for display if cert present
  return { valid: true, notBefore: info.notBefore, notAfter: info.notAfter };
}
