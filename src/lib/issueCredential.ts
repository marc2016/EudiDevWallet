import { ISSUANCE_PRESETS } from '../data/issuancePresets';
import type { MockIdentity } from '../types/openid4vp';
import type { CredentialOffer, IssuedCredentialResult } from '../types/openid4vci';

export async function discoverTokenEndpoint(issuer: string): Promise<string | undefined> {
  const metadataUrls = [
    `${issuer}/.well-known/openid-credential-issuer`,
    `${issuer}/.well-known/openid-configuration`,
  ];
  if (issuer.endsWith('/vci')) {
    const parent = issuer.replace(/\/vci$/, '');
    metadataUrls.push(`${parent}/.well-known/openid-credential-issuer`);
    metadataUrls.push(`${parent}/.well-known/openid-configuration`);
  }

  for (const url of metadataUrls) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data && typeof data === 'object' && typeof data.token_endpoint === 'string') {
          return data.token_endpoint;
        }
      }
    } catch {
      // Ignore discovery errors
    }
  }
  return undefined;
}

export async function fetchOpenID4VCIAccessToken(
  offer: CredentialOffer,
  pin?: string,
  log?: (level: 'info' | 'warn' | 'error' | 'success', category: any, message: string, details?: unknown) => void
): Promise<{ access_token: string; c_nonce?: string } | undefined> {
  if (!offer.credential_issuer.startsWith('http')) {
    return undefined;
  }

  const preAuthGrant = offer.grants?.['urn:ietf:params:oauth:grant-type:pre-authorized_code'];
  const preAuthCode = preAuthGrant?.['pre-authorized_code'];

  // Try well-known discovery first
  const discoveredEndpoint = await discoverTokenEndpoint(offer.credential_issuer);

  const tokenEndpoints = discoveredEndpoint
    ? [discoveredEndpoint]
    : offer.credential_issuer.endsWith('/vci')
      ? [`${offer.credential_issuer}/token`]
      : [
        // Fallbacks for specific environments (e.g. EUDIPLO playground requires /authorize/token)
        `${offer.credential_issuer}/token`,
        `${offer.credential_issuer}/vci/token`,
        `${offer.credential_issuer}/authorize/token`
      ];

  for (const endpoint of tokenEndpoints) {
    try {
      const params = new URLSearchParams();
      params.append('grant_type', 'urn:ietf:params:oauth:grant-type:pre-authorized_code');
      if (preAuthCode) {
        params.append('pre-authorized_code', preAuthCode);
      }
      const requiresPin = preAuthGrant?.tx_code !== undefined || preAuthGrant?.user_pin_required === true;
      if (pin && requiresPin) {
        params.append('tx_code', pin);
      }
      params.append('client_id', 'eudi-dev-wallet');

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      if (res.ok) {
        const data = await res.json();
        if (data && typeof data === 'object' && typeof data.access_token === 'string') {
          log?.('success', 'o4vci', `Echter OpenID4VCI Access Token von Token-Endpoint (${endpoint}) empfangen`, {
            token_type: data.token_type,
            expires_in: data.expires_in,
            c_nonce: data.c_nonce,
          });
          return { access_token: data.access_token, c_nonce: data.c_nonce };
        }
      } else {
        let errBody: unknown;
        try {
          errBody = await res.json();
        } catch {
          errBody = await res.text();
        }
        log?.(res.status >= 400 ? 'warn' : 'info', 'o4vci', `Token Endpoint POST (${endpoint}) → HTTP ${res.status}`, {
          status: res.status,
          response: errBody,
        });
        // If endpoint exists but returned a client error (e.g. 400 invalid_grant), don't try 404 fallbacks
        if (res.status !== 404) {
          break;
        }
      }
    } catch (err) {
      log?.('warn', 'o4vci', `Token Endpoint POST (${endpoint}) nicht erreichbar: ${String(err)}`);
    }
  }

  return undefined;
}

function base64UrlEncode(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function stringToBase64Url(str: string): string {
  return base64UrlEncode(new TextEncoder().encode(str));
}

export async function generateProofJwt(issuer: string, nonce?: string): Promise<string> {
  const keyPair = await crypto.subtle.generateKey(
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['sign', 'verify']
  );

  const jwk = await crypto.subtle.exportKey('jwk', keyPair.publicKey);

  const header = {
    alg: 'ES256',
    typ: 'openid4vci-proof+jwt',
    jwk: {
      kty: jwk.kty,
      crv: jwk.crv,
      x: jwk.x,
      y: jwk.y,
    },
  };

  const payload = {
    aud: issuer,
    iss: 'eudi-dev-wallet',
    iat: Math.floor(Date.now() / 1000),
    nonce: nonce || `nonce-${Date.now()}`,
  };

  const encodedHeader = stringToBase64Url(JSON.stringify(header));
  const encodedPayload = stringToBase64Url(JSON.stringify(payload));
  const unsignedToken = `${encodedHeader}.${encodedPayload}`;

  const signatureBuffer = await crypto.subtle.sign(
    { name: 'ECDSA', hash: { name: 'SHA-256' } },
    keyPair.privateKey,
    new TextEncoder().encode(unsignedToken)
  );

  const encodedSignature = base64UrlEncode(signatureBuffer);
  return `${unsignedToken}.${encodedSignature}`;
}



export function parseIssuedCredentialClaims(credentialData: unknown): {
  claims: Record<string, string>;
  format?: string;
  vct?: string;
} {
  const extractedClaims: Record<string, string> = {};
  let detectedFormat: string | undefined = undefined;
  let vct: string | undefined = undefined;

  let raw: unknown = credentialData;
  if (raw && typeof raw === 'object' && raw !== null && !Array.isArray(raw)) {
    const rawObj = raw as Record<string, unknown>;
    if (rawObj.credential) raw = rawObj.credential;
    else if (Array.isArray(rawObj.credentials) && rawObj.credentials.length > 0) {
      const first = rawObj.credentials[0];
      raw = typeof first === 'object' && first !== null && 'credential' in first ? first.credential : first;
    }
  } else if (Array.isArray(raw) && raw.length > 0) {
    const first = raw[0];
    raw = typeof first === 'object' && first !== null && 'credential' in first ? first.credential : first;
  }

  if (typeof raw === 'string') {
    if (raw.includes('~')) {
      detectedFormat = 'vc+sd-jwt';
      const parts = raw.split('~');

      const jwtPart = parts[0];
      const jwtTokens = jwtPart.split('.');
      if (jwtTokens.length >= 2) {
        try {
          const payloadBase64 = jwtTokens[1].replace(/-/g, '+').replace(/_/g, '/');
          const payloadJson = JSON.parse(atob(payloadBase64));
          if (payloadJson.vct) vct = String(payloadJson.vct);
          if (payloadJson.iss) extractedClaims['issuing_authority'] = String(payloadJson.iss);
        } catch {
          // ignore
        }
      }

      for (let i = 1; i < parts.length; i++) {
        const part = parts[i].trim();
        if (!part) continue;
        try {
          const base64 = part.replace(/-/g, '+').replace(/_/g, '/');
          const decoded = atob(base64);
          const parsed = JSON.parse(decoded);
          if (Array.isArray(parsed) && parsed.length >= 3 && typeof parsed[1] === 'string') {
            const key = parsed[1];
            const val = parsed[2];
            extractedClaims[key] = typeof val === 'object' ? JSON.stringify(val) : String(val);
          }
        } catch {
          // ignore non-disclosure parts
        }
      }
    } else if (raw.includes('.')) {
      detectedFormat = 'vc+sd-jwt';
      const jwtTokens = raw.split('.');
      if (jwtTokens.length >= 2) {
        try {
          const payloadBase64 = jwtTokens[1].replace(/-/g, '+').replace(/_/g, '/');
          const payloadJson = JSON.parse(atob(payloadBase64));
          if (payloadJson.vc?.credentialSubject && typeof payloadJson.vc.credentialSubject === 'object') {
            for (const [k, v] of Object.entries(payloadJson.vc.credentialSubject)) {
              if (k !== 'id') extractedClaims[k] = typeof v === 'object' ? JSON.stringify(v) : String(v);
            }
          } else {
            for (const [k, v] of Object.entries(payloadJson)) {
              if (!['iss', 'sub', 'iat', 'exp', 'nbf', 'jti'].includes(k)) {
                extractedClaims[k] = typeof v === 'object' ? JSON.stringify(v) : String(v);
              }
            }
          }
        } catch {
          // ignore
        }
      }
    }
  } else if (raw && typeof raw === 'object') {
    const rawObj = raw as Record<string, unknown>;
    for (const [k, v] of Object.entries(rawObj)) {
      extractedClaims[k] = typeof v === 'object' ? JSON.stringify(v) : String(v);
    }
  }

  return { claims: extractedClaims, format: detectedFormat, vct };
}

export async function requestLiveCredentialFromIssuer(
  offer: CredentialOffer,
  bearerToken?: string,
  cNonce?: string,
  log?: (level: 'info' | 'warn' | 'error' | 'success', category: any, message: string, details?: unknown) => void
): Promise<{ credential?: unknown; notification_id?: string; access_token?: string } | undefined> {
  if (!offer.credential_issuer.startsWith('http')) {
    return undefined;
  }

  const credentialEndpoint = offer.credential_issuer.endsWith('/vci')
    ? `${offer.credential_issuer}/credential`
    : `${offer.credential_issuer}/vci/credential`;

  const tokenToUse = bearerToken || 'simulated-bearer-token';
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${tokenToUse}`,
  };

  // Helper to fetch a fresh c_nonce from the issuer's dedicated nonce endpoint
  async function fetchFreshNonce(): Promise<string | undefined> {
    const nonceEndpoint = offer.credential_issuer.endsWith('/vci')
      ? `${offer.credential_issuer}/nonce`
      : `${offer.credential_issuer}/vci/nonce`;
    try {
      const nonceRes = await fetch(nonceEndpoint, {
        method: 'POST',
        headers: tokenToUse !== 'simulated-bearer-token' ? { Authorization: `Bearer ${tokenToUse}` } : {},
      });
      if (nonceRes.ok) {
        const nonceData = await nonceRes.json() as { c_nonce?: string };
        if (nonceData.c_nonce) {
          log?.('info', 'o4vci', `Frischer c_nonce vom Nonce-Endpoint abgerufen`, { c_nonce: nonceData.c_nonce });
          return nonceData.c_nonce;
        }
      }
    } catch (e) {
      log?.('warn', 'o4vci', `Fehler beim Abrufen der c_nonce vom Nonce-Endpoint`, { error: String(e) });
    }
    return undefined;
  }

  // Helper to perform one credential POST attempt with a given nonce
  async function attemptCredentialPost(nonce: string | undefined, attempt: number): Promise<{ credential?: unknown; notification_id?: string; access_token?: string } | 'invalid_nonce' | undefined> {
    let proofJwt: string | undefined;
    try {
      proofJwt = await generateProofJwt(offer.credential_issuer, nonce);
    } catch (err) {
      log?.('warn', 'o4vci', `Konnte Proof JWT für Credential Endpoint nicht erzeugen: ${String(err)}`);
    }

    const body: Record<string, unknown> = {
      credential_configuration_id: offer.credential_configuration_ids[0] || 'loyalty-card',
    };
    if (proofJwt) {
      body.proof = { proof_type: 'jwt', jwt: proofJwt };
    }

    if (attempt === 1) {
      log?.('info', 'o4vci', `Live Credential POST (${credentialEndpoint}) mit Holder Proof JWT gestartet`, {
        credential_configuration_id: body.credential_configuration_id,
        hasBearerToken: Boolean(bearerToken),
      });
    } else {
      log?.('info', 'o4vci', `Live Credential POST Retry (${credentialEndpoint}) mit erneutem c_nonce`, {
        attempt,
      });
    }

    const res = await fetch(credentialEndpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (res.ok) {
      const data = (await res.json()) as Record<string, unknown>;
      log?.('success', 'o4vci', `Echtes Credential & Token von Issuer (${credentialEndpoint}) empfangen`, data);
      return {
        credential: data.credential ?? data.credentials ?? data,
        notification_id: typeof data.notification_id === 'string' ? data.notification_id : undefined,
        access_token: typeof data.access_token === 'string' ? data.access_token : undefined,
      };
    }

    let errBody: unknown;
    try {
      errBody = await res.json();
    } catch {
      errBody = await res.text();
    }

    // Check for invalid_nonce — retry with a fresh nonce from the nonce endpoint
    const errObj = typeof errBody === 'object' && errBody !== null ? (errBody as Record<string, unknown>) : {};
    if (res.status === 400 && errObj['error'] === 'invalid_nonce') {
      log?.('warn', 'o4vci', `Live Credential Endpoint POST (${credentialEndpoint}) → HTTP ${res.status} (invalid_nonce)`, {
        status: res.status,
        response: errBody,
      });
      return 'invalid_nonce';
    }

    log?.('warn', 'o4vci', `Live Credential Endpoint POST (${credentialEndpoint}) → HTTP ${res.status}`, {
      status: res.status,
      response: errBody,
    });
    return undefined;
  }

  try {
    // If no c_nonce was supplied, proactively fetch one from the dedicated nonce endpoint
    let activeNonce = cNonce;
    if (!activeNonce) {
      activeNonce = await fetchFreshNonce();
    }

    const firstResult = await attemptCredentialPost(activeNonce, 1);

    if (firstResult === 'invalid_nonce') {
      // Retry once with a fresh nonce from the dedicated nonce endpoint
      log?.('info', 'o4vci', `Hole frischen c_nonce vom Nonce-Endpoint für Credential Retry …`);
      const freshNonce = await fetchFreshNonce();
      const retryResult = await attemptCredentialPost(freshNonce, 2);
      if (retryResult !== 'invalid_nonce') return retryResult;
      return undefined;
    }

    return firstResult;
  } catch (err) {
    log?.('info', 'o4vci', `Live Credential Request (${credentialEndpoint}) nicht möglich: ${String(err)}`);
  }

  return undefined;
}

function formatCredentialLabel(raw: string): string {
  if (!raw) return 'Credential';
  const mapping: Record<string, string> = {
    'university-diploma': 'University Diploma',
    'eu.europa.ec.eudi.pid.1': 'EU Personalausweis (PID)',
    'eu.europa.ec.eudi.health.ehic.1': 'EU Health Card (EHIC)',
    'org.iso.18013.5.1.mDL': 'EU Führerschein (mDL)',
  };
  if (mapping[raw]) return mapping[raw];

  return raw
    .split(/[-_.]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export async function simulateIssueCredential(
  offer: CredentialOffer,
  userClaimsOverride?: Record<string, string>,
  pin?: string,
  log?: (level: 'info' | 'warn' | 'error' | 'success', category: any, message: string, details?: unknown) => void
): Promise<IssuedCredentialResult> {
  // Simulate network latency
  await new Promise((res) => setTimeout(res, 600));

  const isRealIssuer = offer.credential_issuer.startsWith('http');
  let accessToken: string | undefined;
  // For simulated issuers we generate a local notification id; for real issuers
  // we only use the notification_id returned by the server (undefined = don't notify).
  let notificationId: string | undefined = isRealIssuer
    ? undefined
    : `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  let liveCredentialData: unknown = undefined;

  if (isRealIssuer) {
    const tokenData = await fetchOpenID4VCIAccessToken(offer, pin, log);
    if (tokenData) {
      accessToken = tokenData.access_token;
    }
    const liveResult = await requestLiveCredentialFromIssuer(offer, accessToken, tokenData?.c_nonce, log);
    if (liveResult) {
      if (liveResult.access_token) {
        accessToken = liveResult.access_token;
      }
      if (liveResult.notification_id) {
        notificationId = liveResult.notification_id;
      }
      if (liveResult.credential) {
        liveCredentialData = liveResult.credential;
      }
    }
  }

  const preset = ISSUANCE_PRESETS.find((p) => p.id === offer.preset_id);

  let liveClaims: Record<string, string> = {};
  if (liveCredentialData) {
    const parsed = parseIssuedCredentialClaims(liveCredentialData);
    liveClaims = parsed.claims;
    if (Object.keys(liveClaims).length > 0) {
      log?.('info', 'o4vci', `Aus echtem Issuer Credential (SD-JWT) extrahierte Claims (${Object.keys(liveClaims).length}):`, liveClaims);
    }
  }

  const defaultFallbackClaims = {
    given_name: 'Max',
    family_name: 'Mustermann',
    birth_date: '1990-01-15',
    document_type: offer.credential_configuration_ids[0] ?? 'Custom EAA',
    issuing_authority: offer.credential_issuer,
    issue_date: new Date().toISOString().split('T')[0] ?? '',
  };

  const hasLiveClaims = Object.keys(liveClaims).length > 0;
  const claims: Record<string, string> = {
    ...(hasLiveClaims ? liveClaims : preset?.claims ?? defaultFallbackClaims),
    ...userClaimsOverride,
  };

  if (!claims.document_type) {
    claims.document_type = offer.credential_configuration_ids[0] ?? 'Custom EAA';
  }
  if (!claims.issuing_authority) {
    claims.issuing_authority = offer.credential_issuer;
  }
  if (offer.credential_configuration_ids.includes('university-diploma')) {
    if (!claims.degree_name) claims.degree_name = 'Master of Science';
    if (!claims.university_name) claims.university_name = 'EUDI Playground University';
    if (!claims.graduation_year) claims.graduation_year = '2025';
  }

  const id = `issued-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  let label = preset?.label || offer.display?.name;
  if (!label) {
    if (claims.organization_name) {
      const org = claims.organization_name;
      label = org.toLowerCase().includes('fitlife') ? 'FitLife Mitgliedschaft' : `${org} Mitgliedschaft`;
    } else if (offer.display_name && !offer.display_name.includes('Offer')) {
      label = offer.display_name;
    } else {
      label = formatCredentialLabel(offer.credential_configuration_ids[0] || 'Credential');
    }
  }

  const category = preset?.category ?? 'Ausgestellte Credentials';
  const description =
    offer.display?.description ||
    (claims.organization_name
      ? `Digitale Mitgliedskarte für ${claims.organization_name}`
      : (preset?.description ?? `Erfolgreich von ${offer.credential_issuer} empfangen`));

  const identity: MockIdentity = {
    id,
    label,
    category,
    description,
    claims,
    display: offer.display,
  };

  const issuedAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 5 * 365 * 24 * 60 * 60 * 1000).toISOString();

  return {
    identity,
    format: preset?.format ?? 'vc+sd-jwt',
    issuedAt,
    expiresAt,
    credentialId: `urn:uuid:${id}`,
    issuer: offer.credential_issuer,
    accessToken,
    notification: notificationId
      ? {
        notification_id: notificationId,
        event: 'credential_accepted',
        event_description: 'Credential successfully stored in EudiDevWallet',
      }
      : undefined,
  };
}

export interface NotificationResult {
  endpoint: string;
  status: number;
  ok: boolean;
  durationMs: number;
  payload: Record<string, unknown>;
  responseBody?: unknown;
}

export async function sendCredentialNotification(
  endpoint: string,
  notificationPayload: Record<string, unknown>,
  log?: (level: 'info' | 'warn' | 'error' | 'success', category: any, message: string, details?: unknown) => void,
  accessToken?: string
): Promise<NotificationResult> {
  const start = performance.now();
  const tokenToUse = accessToken || 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.mock_access_token_eudi_wallet';

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenToUse}`,
      },
      body: JSON.stringify(notificationPayload),
    });

    const durationMs = Math.round(performance.now() - start);
    let responseBody: unknown;
    try {
      responseBody = await res.json();
    } catch {
      responseBody = await res.text();
    }

    if (res.status === 404) {
      let fallbackEndpoint: string | null = null;
      if (endpoint.endsWith('/notification') && !endpoint.endsWith('/vci/notification')) {
        fallbackEndpoint = endpoint.replace(/\/notification$/, '/vci/notification');
      } else if (endpoint.endsWith('/vci/notification')) {
        fallbackEndpoint = endpoint.replace(/\/vci\/notification$/, '/notification');
      }

      if (fallbackEndpoint) {
        log?.('warn', 'o4vci', `Primary Notification Endpoint HTTP 404 → Versuche Fallback-Endpoint: ${fallbackEndpoint}`);
        return await sendCredentialNotification(fallbackEndpoint, notificationPayload, log, accessToken);
      }
    }

    const isTokenVerificationError =
      typeof responseBody === 'object' &&
      responseBody !== null &&
      JSON.stringify(responseBody).includes('invalid_token');

    const logTitle = res.ok
      ? `Notification Endpoint POST (${notificationPayload.event}) → HTTP ${res.status} OK`
      : isTokenVerificationError
        ? `Notification Endpoint von Issuer/Playground kontaktiert (HTTP ${res.status}: Server verlangt echten Live-OAuth-Token)`
        : `Notification Endpoint POST (${notificationPayload.event}) → HTTP ${res.status}`;

    const maskedToken = tokenToUse.length > 15 ? `${tokenToUse.substring(0, 10)}…` : tokenToUse;

    log?.(
      res.ok || isTokenVerificationError ? 'success' : 'warn',
      'o4vci',
      logTitle,
      {
        endpoint,
        status: res.status,
        durationMs,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${maskedToken}`,
        },
        payload: notificationPayload,
        responseBody,
        note: isTokenVerificationError
          ? 'Der EUDI-Playground-Server hat die Benachrichtigung empfangen und ausgewertet. Da es sich um eine Simulation handelt, lehnt der Server den generierten Test-Bearer-Token ab.'
          : undefined,
      }
    );

    return {
      endpoint,
      status: res.status,
      ok: res.ok,
      durationMs,
      payload: notificationPayload,
      responseBody,
    };
  } catch (err) {
    const durationMs = Math.round(performance.now() - start);

    log?.('info', 'o4vci', `Notification POST simuliert (HTTP 204 No Content)`, {
      endpoint,
      status: 204,
      durationMs,
      payload: notificationPayload,
      note: 'Simulierter Issuer Notification Endpoint',
    });

    return {
      endpoint,
      status: 204,
      ok: true,
      durationMs,
      payload: notificationPayload,
    };
  }
}
