import { importX509, jwtVerify } from 'jose';
import type { CertificateMode } from '../types/openid4vp';
import type { AuthorizationRequest, CertificateValidationResult } from '../types/openid4vp';
import { certificateValidity, extractCertificatesFromRequest } from './extractCertificates';
import type { LogFn } from '../types/openid4vp';

export async function validateCertificates(
  request: AuthorizationRequest,
  mode: CertificateMode,
  log?: LogFn,
): Promise<CertificateValidationResult> {
  const { wrpac, wrprc, x5cChain, expectsX509ClientId } =
    extractCertificatesFromRequest(request);

  if (mode === 'off') {
    return { valid: true, level: 'success', messages: [], blocksApproval: false };
  }

  if (mode === 'strict') {
    return {
      valid: false,
      level: 'warn',
      messages: ['Strikte Prüfung (Phase 2) — noch nicht implementiert'],
      blocksApproval: true,
    };
  }

  const messages: string[] = [];
  let level: 'success' | 'warn' | 'error' = 'success';
  let blocksApproval = false;
  let signatureValid: boolean | undefined;

  if (!wrpac && x5cChain.length === 0) {
    if (expectsX509ClientId) {
      messages.push('Kein WRPAC/x5c gefunden, obwohl client_id x509-basiert ist');
      if (mode === 'soft') {
        level = 'error';
        blocksApproval = true;
      } else {
        level = 'warn';
      }
    } else if (mode === 'display') {
      messages.push('Kein Zertifikat in der Anfrage enthalten');
      level = 'warn';
    }
  } else {
    const validity = certificateValidity(wrpac);
    messages.push(`WRPAC erkannt${validity.valid ? '' : ' (Gültigkeit unklar)'}`);
    log?.('info', 'cert', 'Zertifikat geparst', wrpac);
  }

  if (wrprc) {
    messages.push(`WRPRC dekodiert (sub: ${String(wrprc.sub ?? '—')})`);
    log?.('info', 'cert', 'WRPRC dekodiert', wrprc);
  }

  if (mode === 'soft' && request.requestJwt && x5cChain[0]) {
    try {
      const pem = `-----BEGIN CERTIFICATE-----\n${x5cChain[0].match(/.{1,64}/g)?.join('\n')}\n-----END CERTIFICATE-----`;
      const key = await importX509(pem, 'RS256');
      await jwtVerify(request.requestJwt, key);
      signatureValid = true;
      messages.push('JWT-Signatur gültig');
      log?.('success', 'cert', 'JWT-Signatur gültig', { algorithm: 'RS256' });
    } catch (err) {
      signatureValid = false;
      messages.push(`JWT-Signatur ungültig: ${String(err)}`);
      level = 'error';
      blocksApproval = true;
      log?.('error', 'cert', 'JWT-Signatur ungültig', { error: String(err) });
    }
  }

  const valid = level !== 'error' && !blocksApproval;
  log?.(valid ? 'success' : 'error', 'cert', 'Zertifikatsprüfung abgeschlossen', {
    messages,
    blocksApproval,
  });

  return {
    valid,
    level,
    messages,
    wrpac,
    wrprc,
    signatureValid,
    blocksApproval,
  };
}
