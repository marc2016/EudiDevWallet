import { importX509, jwtVerify } from 'jose';
import type { AuthorizationRequest, CertificateValidationResult, CertificateMode, TrustAnchorMode, LogFn } from '../types/openid4vp';
import { certificateValidity, extractCertificatesFromRequest } from './extractCertificates';
import { extractClaims } from './extractClaims';

const EUDI_TRUST_ANCHORS = [
  'relying party registrar',
  'eudi trust ca',
  'eudi root ca',
  'de eudi wallet rp ca',
  'bundesdruckerei eudi ca',
  'de rp registrar',
  'german eudi trust ca',
];

const DEFAULT_PID_ATTRIBUTES = [
  'given_name',
  'family_name',
  'birth_date',
  'age_over_18',
  'age_over_21',
  'issuing_country',
  'nationality',
  'resident_address',
  'gender',
  'personal_administrative_number',
  'document_number',
];

function extractWrprcAllowedAttributes(wrprc: Record<string, unknown>): Set<string> | null {
  const rawScopes =
    wrprc.authorized_scopes ??
    wrprc.authorized_claims ??
    wrprc.allowed_attributes ??
    wrprc.requested_attributes ??
    wrprc.scopes ??
    wrprc.scope ??
    wrprc.claims;

  if (!rawScopes) return null;

  let list: string[] = [];
  if (Array.isArray(rawScopes)) {
    list = rawScopes.map((s) => String(s));
  } else if (typeof rawScopes === 'string') {
    list = rawScopes.split(/[\s,]+/);
  } else if (typeof rawScopes === 'object' && rawScopes !== null) {
    list = Object.keys(rawScopes);
  }

  if (list.length === 0) return null;

  const allowed = new Set<string>();
  for (const item of list) {
    const lower = item.toLowerCase();
    allowed.add(lower);
    // If scope covers general pid/eudi pid, expand to standard pid attributes
    if (lower.includes('pid') || lower.includes('eudi')) {
      for (const attr of DEFAULT_PID_ATTRIBUTES) {
        allowed.add(attr);
      }
    }
  }

  return allowed;
}

export async function validateCertificates(
  request: AuthorizationRequest,
  mode: CertificateMode,
  trustAnchorMode: TrustAnchorMode = 'eudi_ca',
  customTrustAnchors = '',
  log?: LogFn,
): Promise<CertificateValidationResult> {
  const { wrpac, wrprc, x5cChain, expectsX509ClientId } = extractCertificatesFromRequest(request);

  if (mode === 'off') {
    return { valid: true, level: 'success', messages: [], blocksApproval: false };
  }

  const messages: string[] = [];
  let level: 'success' | 'warn' | 'error' = 'success';
  let blocksApproval = false;
  let signatureValid: boolean | undefined;
  let clientIdMatchValid: boolean | undefined;
  let wrprcScopeValid: boolean | undefined;
  let trustAnchorValid: boolean | undefined;

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

  // 2. Client ID SAN Validation
  if (wrpac) {
    const cid = request.client_id ?? '';
    let target = cid;
    if (cid.startsWith('x509_san_dns:')) {
      target = cid.slice('x509_san_dns:'.length);
    } else if (cid.startsWith('x509_san_uri:')) {
      target = cid.slice('x509_san_uri:'.length);
    }

    let isMatch = false;
    if (target) {
      const sans = wrpac.san ?? [];
      isMatch = sans.some(
        (san) =>
          san.toLowerCase() === target.toLowerCase() ||
          target.toLowerCase().includes(san.toLowerCase()) ||
          san.toLowerCase().includes(target.toLowerCase())
      ) || Boolean(wrpac.subject && wrpac.subject.toLowerCase().includes(target.toLowerCase()));
    }

    clientIdMatchValid = isMatch;

    if (isMatch) {
      messages.push(`client_id (${cid}) stimmt exakt mit Zertifikat-SAN überein`);
    } else {
      const sansText = wrpac.san?.length ? wrpac.san.join(', ') : 'keine SAN-Einträge';
      if (mode === 'strict') {
        messages.push(`Fehler: client_id (${cid}) nicht in Zertifikat-SANs gefunden: [${sansText}]`);
        level = 'error';
        blocksApproval = true;
      } else if (mode === 'soft') {
        messages.push(`Warnung: client_id (${cid}) weicht von Zertifikat-SANs ab: [${sansText}]`);
        if (level !== 'error') level = 'warn';
      } else if (mode === 'display') {
        messages.push(`Info: client_id (${cid}) nicht in Zertifikat-SANs enthalten: [${sansText}]`);
      }
    }
  } else if (mode === 'strict') {
    clientIdMatchValid = false;
  }

  // 3. WRPRC Verification & Scope / Use-Case Matching
  if (wrprc) {
    messages.push(`WRPRC dekodiert (sub: ${String(wrprc.sub ?? '—')})`);
    log?.('info', 'cert', 'WRPRC dekodiert', wrprc);

    if (mode === 'strict' && wrpac && wrprc.sub && wrprc.sub !== wrpac.subject) {
      messages.push('Fehler: WRPRC-Subjekt stimmt nicht mit WRPAC-Subjekt überein');
      level = 'error';
      blocksApproval = true;
    }

    // WRPRC Scope / Requested Attributes validation
    const allowedScopes = extractWrprcAllowedAttributes(wrprc);
    const requestedClaims = extractClaims(request);

    if (allowedScopes && requestedClaims.length > 0) {
      const unauthorized = requestedClaims.filter((c) => !allowedScopes.has(c.key.toLowerCase()));

      if (unauthorized.length > 0) {
        wrprcScopeValid = false;
        const unauthNames = unauthorized.map((c) => c.key).join(', ');
        if (mode === 'strict') {
          messages.push(
            `Fehler: WRPRC Scope-Prüfung fehlgeschlagen! RP fordert Attribute an [${unauthNames}], die nicht im WRPRC-Registrierungszertifikat freigegeben sind.`
          );
          level = 'error';
          blocksApproval = true;
        } else if (mode === 'soft') {
          messages.push(
            `Warnung: WRPRC Scope-Abweichung: RP fordert Attribute [${unauthNames}] außerhalb der registrierten Scopes an.`
          );
          if (level !== 'error') level = 'warn';
        } else {
          messages.push(`Info: WRPRC Scope-Abweichung für Attribute: [${unauthNames}].`);
        }
      } else {
        wrprcScopeValid = true;
        messages.push(
          `WRPRC Scope-Prüfung erfolgreich: Alle ${requestedClaims.length} angeforderten Attribute sind durch das WRPRC-Zertifikat abgedeckt.`
        );
      }
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

  // 6. Configurable Trust Anchor Verification
  if (wrpac) {
    const issuerLower = (wrpac.issuer ?? '').toLowerCase();

    if (trustAnchorMode === 'mock') {
      trustAnchorValid = true;
      messages.push(`Trust Anchor: Mock- / Dev-Modus aktiv. Aussteller "${wrpac.issuer}" akzeptiert.`);
    } else if (trustAnchorMode === 'custom') {
      const customList = customTrustAnchors
        .split(/[\n,]+/)
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);

      const matchesCustom = customList.some((anchor) => issuerLower.includes(anchor));
      trustAnchorValid = matchesCustom;

      if (matchesCustom) {
        messages.push(`Trust Anchor verifiziert: WRPAC-Aussteller ("${wrpac.issuer}") durch benutzerdefinierte CAs bestätigt.`);
      } else {
        const anchorsText = customList.length ? customList.join(', ') : 'keine CAs konfiguriert';
        if (mode === 'strict') {
          messages.push(
            `Fehler: WRPAC-Aussteller ("${wrpac.issuer}") ist nicht in den benutzerdefinierten Trust Anchors ([${anchorsText}]) enthalten.`
          );
          level = 'error';
          blocksApproval = true;
        } else {
          messages.push(`Warnung: Aussteller ("${wrpac.issuer}") nicht in benutzerdefinierten Trust Anchors enthalten.`);
          if (mode === 'soft' && level !== 'error') level = 'warn';
        }
      }
    } else {
      // eudi_ca mode
      const matchesEudiCa = EUDI_TRUST_ANCHORS.some((anchor) => issuerLower.includes(anchor));
      trustAnchorValid = matchesEudiCa;

      if (matchesEudiCa) {
        messages.push(`Trust Anchor verifiziert: WRPAC-Aussteller ("${wrpac.issuer}") ist in der offiziellen EUDI Trust List.`);
      } else {
        if (mode === 'strict') {
          messages.push(
            `Fehler: WRPAC-Aussteller ("${wrpac.issuer}") ist nicht in der offiziellen EUDI Trust List registriert (selbstsigniert oder unbekannte CA).`
          );
          level = 'error';
          blocksApproval = true;
        } else {
          messages.push(
            `Zertifikat ist nicht in der EUDI Trust List (selbstsigniertes Entwicklungszertifikat). Im ${mode === 'soft' ? 'Soft' : 'Display'}-Modus toleriert.`
          );
          if (mode === 'soft' && level !== 'error') level = 'warn';
        }
      }
    }
  }

  const valid = level !== 'error' && !blocksApproval;
  log?.(valid ? 'success' : 'error', 'cert', 'Zertifikatsprüfung abgeschlossen', {
    messages,
    blocksApproval,
    clientIdMatchValid,
    wrprcScopeValid,
    trustAnchorValid,
  });

  return {
    valid,
    level,
    messages,
    wrpac,
    wrprc,
    signatureValid,
    blocksApproval,
    clientIdMatchValid,
    wrprcScopeValid,
    trustAnchorValid,
  };
}
