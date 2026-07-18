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

  const messages: string[] = [];
  let level: 'success' | 'warn' | 'error' = 'success';
  let blocksApproval = false;
  let signatureValid: boolean | undefined;

  // 1. Certificate Presence Check
  if (!wrpac && x5cChain.length === 0) {
    if (mode === 'strict') {
      messages.push('Fehler: WRPAC-Zertifikat (x5c) fehlt in der Anfrage (in strikter Prüfung erforderlich)');
      level = 'error';
      blocksApproval = true;
    } else if (expectsX509ClientId) {
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

  // 2. Client ID SAN Validation (Strict Mode only)
  if (mode === 'strict' && wrpac) {
    let clientIdValid = false;
    const cid = request.client_id ?? '';
    
    if (cid.startsWith('x509_san_dns:')) {
      const expectedDns = cid.slice('x509_san_dns:'.length);
      if (wrpac.san?.includes(expectedDns)) {
        clientIdValid = true;
        messages.push(`client_id (x509_san_dns: ${expectedDns}) stimmt mit Zertifikat-SAN überein`);
      } else {
        messages.push(`Fehler: client_id DNS (${expectedDns}) nicht in Zertifikat-SANs gefunden: [${wrpac.san?.join(', ') ?? ''}]`);
      }
    } else if (cid.startsWith('x509_san_uri:')) {
      const expectedUri = cid.slice('x509_san_uri:'.length);
      if (wrpac.san?.includes(expectedUri)) {
        clientIdValid = true;
        messages.push(`client_id (x509_san_uri: ${expectedUri}) stimmt mit Zertifikat-SAN überein`);
      } else {
        messages.push(`Fehler: client_id URI (${expectedUri}) nicht in Zertifikat-SANs gefunden: [${wrpac.san?.join(', ') ?? ''}]`);
      }
    } else {
      messages.push(`Fehler: client_id (${cid}) hat in strikter Prüfung kein gültiges x509_san-Präfix`);
    }

    if (!clientIdValid) {
      level = 'error';
      blocksApproval = true;
    }
  }

  // 3. WRPRC Verification & Subject Matching
  if (wrprc) {
    messages.push(`WRPRC dekodiert (sub: ${String(wrprc.sub ?? '—')})`);
    log?.('info', 'cert', 'WRPRC dekodiert', wrprc);
    
    if (mode === 'strict' && wrpac && wrprc.sub && wrprc.sub !== wrpac.subject) {
      messages.push('Fehler: WRPRC-Subjekt stimmt nicht mit WRPAC-Subjekt überein');
      level = 'error';
      blocksApproval = true;
    }
  }

  // 4. JWT Request Object presence in strict mode
  if (mode === 'strict' && !request.requestJwt) {
    messages.push('Fehler: Die Anfrage ist nicht als signiertes JWT übergeben worden');
    level = 'error';
    blocksApproval = true;
  }

  // 5. Signature Verification
  if ((mode === 'soft' || mode === 'strict') && request.requestJwt && x5cChain[0]) {
    try {
      const pem = `-----BEGIN CERTIFICATE-----\n${x5cChain[0].match(/.{1,64}/g)?.join('\n')}\n-----END CERTIFICATE-----`;
      const alg = (request.requestJwtHeader?.alg as string) ?? 'RS256';
      const key = await importX509(pem, alg);
      await jwtVerify(request.requestJwt, key);
      signatureValid = true;
      messages.push(`JWT-Signatur gültig (${alg})`);
      log?.('success', 'cert', 'JWT-Signatur gültig', { algorithm: alg });
    } catch (err) {
      signatureValid = false;
      messages.push(`JWT-Signatur ungültig: ${String(err)}`);
      level = 'error';
      blocksApproval = true;
      log?.('error', 'cert', 'JWT-Signatur ungültig', { error: String(err) });
    }
  }

  // 6. Trust Anchor Simulation
  if (mode === 'strict' && wrpac && level !== 'error') {
    const isMockRegistrar = wrpac.issuer?.includes('Relying Party Registrar') || wrpac.issuer?.includes('EUDI Trust CA');
    if (isMockRegistrar) {
      messages.push('Zertifikatsaussteller verifiziert gegen Relying Party Registrar Trust Anchor (EUDI CA)');
    } else {
      messages.push('Zertifikat ist nicht in der EUDI Trust List (selbstsigniertes Entwicklungszertifikat). Simuliert akzeptiert.');
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
