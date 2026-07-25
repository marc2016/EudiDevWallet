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
        log?.('info', 'o4vci', `Token Endpoint POST (${endpoint}) → HTTP ${res.status}`, {
          status: res.status,
          response: errBody,
        });
        // If endpoint exists but returned a client error (e.g. 400 invalid_grant), don't try 404 fallbacks
        if (res.status !== 404) {
          break;
        }
      }
    } catch (err) {
      log?.('info', 'o4vci', `Token Endpoint POST (${endpoint}) nicht erreichbar: ${String(err)}`);
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

  try {
    let finalNonce = cNonce;
    if (!finalNonce) {
      const nonceEndpoint = offer.credential_issuer.endsWith('/vci')
        ? `${offer.credential_issuer}/nonce`
        : `${offer.credential_issuer}/vci/nonce`;
      
      try {
        const nonceRes = await fetch(nonceEndpoint, {
          method: 'POST',
          headers: bearerToken ? { Authorization: `Bearer ${bearerToken}` } : {},
        });
        if (nonceRes.ok) {
          const nonceData = await nonceRes.json() as { c_nonce?: string };
          if (nonceData.c_nonce) {
            finalNonce = nonceData.c_nonce;
            log?.('info', 'o4vci', `Neue c_nonce vom Nonce-Endpoint abgerufen`, { c_nonce: finalNonce });
          }
        }
      } catch (e) {
        log?.('warn', 'o4vci', `Fehler beim Abrufen der c_nonce vom Nonce-Endpoint`, { error: String(e) });
      }
    }

    const proofJwt = await generateProofJwt(offer.credential_issuer, finalNonce);
    const rawConfigId = offer.credential_configuration_ids[0];
    const configId = (!rawConfigId || rawConfigId === 'eu.europa.ec.eudi.pid.1') ? 'pid' : rawConfigId;

    const body = {
      credential_configuration_id: configId,
      proof: {
        proof_type: 'jwt',
        jwt: proofJwt,
      },
    };

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (bearerToken) {
      headers['Authorization'] = `Bearer ${bearerToken}`;
    }

    log?.('info', 'o4vci', `Live Credential POST (${credentialEndpoint}) mit Holder Proof JWT gestartet`, {
      credential_configuration_id: configId,
      hasBearerToken: Boolean(bearerToken),
    });

    const res = await fetch(credentialEndpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (res.ok) {
      const data = (await res.json()) as Record<string, unknown>;
      log?.('success', 'o4vci', `Echtes Credential & Token von Issuer (${credentialEndpoint}) empfangen`, data);
      return {
        credential: data.credential,
        notification_id: typeof data.notification_id === 'string' ? data.notification_id : undefined,
        access_token: typeof data.access_token === 'string' ? data.access_token : undefined,
      };
    } else {
      let errBody: unknown;
      try {
        errBody = await res.json();
      } catch {
        errBody = await res.text();
      }
      log?.('warn', 'o4vci', `Live Credential Endpoint POST (${credentialEndpoint}) → HTTP ${res.status}`, {
        status: res.status,
        response: errBody,
      });
    }
  } catch (err) {
    log?.('info', 'o4vci', `Live Credential Request (${credentialEndpoint}) nicht möglich: ${String(err)}`);
  }

  return undefined;
}

export async function simulateIssueCredential(
  offer: CredentialOffer,
  userClaimsOverride?: Record<string, string>,
  pin?: string,
  log?: (level: 'info' | 'warn' | 'error' | 'success', category: any, message: string, details?: unknown) => void
): Promise<IssuedCredentialResult> {
  // Simulate network latency
  await new Promise((res) => setTimeout(res, 600));

  let accessToken: string | undefined;
  let notificationId = `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  if (offer.credential_issuer.startsWith('http')) {
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
    }
  }

  const preset = ISSUANCE_PRESETS.find((p) => p.id === offer.preset_id);

  const claims: Record<string, string> = {
    ...(preset?.claims ?? {
      given_name: 'Max',
      family_name: 'Mustermann',
      birth_date: '1990-01-15',
      document_type: offer.credential_configuration_ids[0] ?? 'Custom EAA',
      issuing_authority: offer.credential_issuer,
      issue_date: new Date().toISOString().split('T')[0] ?? '',
    }),
    ...userClaimsOverride,
  };

  const id = `issued-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const label = preset?.label ?? `📥 ${offer.display_name || offer.credential_configuration_ids[0]}`;
  const category = preset?.category ?? 'Ausgestellte Credentials';
  const description = preset?.description ?? `Erfolgreich von ${offer.credential_issuer} empfangen`;

  const identity: MockIdentity = {
    id,
    label,
    category,
    description,
    claims,
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
    notification: {
      notification_id: notificationId,
      event: 'credential_accepted',
      event_description: 'Credential successfully stored in EudiDevWallet',
    },
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
        log?.('info', 'o4vci', `Primary Notification Endpoint HTTP 404 → Versuche Fallback-Endpoint: ${fallbackEndpoint}`);
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
