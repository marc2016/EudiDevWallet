import { ISSUANCE_PRESETS } from '../data/issuancePresets';
import type { CredentialOffer } from '../types/openid4vci';

export function isCredentialOfferInput(input: string): boolean {
  if (!input) return false;
  const trimmed = input.trim();

  if (trimmed.startsWith('openid-credential-offer://')) return true;
  if (trimmed.includes('credential_offer=') || trimmed.includes('credential_offer_uri=')) return true;

  if (ISSUANCE_PRESETS.some((p) => p.id === trimmed)) return true;

  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsed = JSON.parse(trimmed) as Record<string, unknown>;
      if (parsed.credential_issuer || parsed.credential_configuration_ids || parsed.credential_types) {
        return true;
      }
    } catch {
      return false;
    }
  }

  return false;
}

export function extractIssuerFromOfferUri(offerUri: string): { issuer: string; notificationEndpoint: string } {
  try {
    const url = new URL(offerUri);
    let pathname = url.pathname;
    const offerIdx = pathname.search(/\/(credential-offers|offers|credential-offer)\b/i);
    if (offerIdx !== -1) {
      pathname = pathname.substring(0, offerIdx);
    } else {
      pathname = pathname.replace(/\/[a-f0-9-]{16,}$/i, '');
    }
    pathname = pathname.replace(/\/+$/, '');
    const issuer = `${url.origin}${pathname}`;
    const notificationEndpoint = pathname.endsWith('/vci')
      ? `${issuer}/notification`
      : `${issuer}/vci/notification`;
    return { issuer, notificationEndpoint };
  } catch {
    const cleaned = offerUri.replace(/\/+$/, '');
    const notificationEndpoint = cleaned.endsWith('/vci')
      ? `${cleaned}/notification`
      : `${cleaned}/vci/notification`;
    return {
      issuer: cleaned,
      notificationEndpoint,
    };
  }
}

export function parseCredentialOffer(input: string): CredentialOffer {
  const trimmed = input.trim();

  // Check preset match
  const preset = ISSUANCE_PRESETS.find((p) => p.id === trimmed);
  if (preset) {
    return {
      credential_issuer: preset.issuerName,
      credential_configuration_ids: [preset.credentialType],
      display_name: preset.label,
      preset_id: preset.id,
      notification_endpoint: `https://issuer.eudi-wallet.de/notification`,
      grants: preset.requiresPin
        ? {
            'urn:ietf:params:oauth:grant-type:pre-authorized_code': {
              'pre-authorized_code': 'mock-pre-auth-code-12345',
              user_pin_required: true,
              tx_code: {
                input_mode: 'numeric',
                length: preset.defaultPin?.length ?? 6,
                description: `Eingabe des ${preset.defaultPin?.length ?? 6}-stelligen Freigabecodes (Standard: ${preset.defaultPin ?? '123456'})`,
              },
            },
          }
        : undefined,
    };
  }

  // Parse JSON input
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsed = JSON.parse(trimmed) as Record<string, unknown>;
      const issuer = String(parsed.credential_issuer ?? 'https://issuer.example.com');
      const cleanIssuer = extractIssuerFromOfferUri(issuer).issuer;
      return {
        credential_issuer: cleanIssuer,
        credential_configuration_ids: Array.isArray(parsed.credential_configuration_ids)
          ? parsed.credential_configuration_ids.map(String)
          : [String(parsed.credential_type ?? 'eu.europa.ec.eudi.pid.1')],
        grants: (parsed.grants as CredentialOffer['grants']) ?? undefined,
        display_name: String(parsed.display_name ?? 'Externes Credential Offer'),
        notification_endpoint: String(parsed.notification_endpoint ?? `${cleanIssuer}/notification`),
      };
    } catch {
      // Fallback
    }
  }

  // Parse URL / Scheme input
  try {
    let urlStr = trimmed;
    if (urlStr.startsWith('openid-credential-offer://')) {
      urlStr = urlStr.replace('openid-credential-offer://', 'https://dummy/');
    }
    const url = new URL(urlStr);

    const offerParam = url.searchParams.get('credential_offer');
    if (offerParam) {
      const parsed = JSON.parse(offerParam) as Record<string, unknown>;
      const issuer = String(parsed.credential_issuer ?? 'https://issuer.example.com');
      const cleanIssuer = extractIssuerFromOfferUri(issuer).issuer;
      return {
        credential_issuer: cleanIssuer,
        credential_configuration_ids: Array.isArray(parsed.credential_configuration_ids)
          ? parsed.credential_configuration_ids.map(String)
          : ['eu.europa.ec.eudi.pid.1'],
        grants: parsed.grants as CredentialOffer['grants'],
        display_name: 'OpenID4VCI Offer',
        notification_endpoint: `${cleanIssuer}/notification`,
      };
    }

    const offerUriParam = url.searchParams.get('credential_offer_uri');
    if (offerUriParam) {
      const { issuer, notificationEndpoint } = extractIssuerFromOfferUri(offerUriParam);
      return {
        credential_issuer: issuer,
        credential_configuration_ids: ['eu.europa.ec.eudi.pid.1'],
        display_name: 'OpenID4VCI Offer',
        notification_endpoint: notificationEndpoint,
      };
    }
  } catch {
    // Fallthrough to generic default
  }

  return {
    credential_issuer: 'https://issuer.eudi-wallet.de',
    credential_configuration_ids: ['de.bund.eudi.custom.1'],
    display_name: 'Manuelles Credential Offer',
    notification_endpoint: 'https://issuer.eudi-wallet.de/notification',
  };
}

export async function resolveCredentialOfferAsync(
  input: string,
  log?: (level: 'info' | 'warn' | 'error' | 'success', category: any, message: string, details?: unknown) => void
): Promise<CredentialOffer> {
  const initial = parseCredentialOffer(input);

  let offerUri: string | null = null;
  try {
    let urlStr = input.trim();
    if (urlStr.startsWith('openid-credential-offer://')) {
      urlStr = urlStr.replace('openid-credential-offer://', 'https://dummy/');
    }
    const url = new URL(urlStr);
    offerUri = url.searchParams.get('credential_offer_uri');
  } catch {
    // ignore
  }

  if (offerUri) {
    try {
      log?.('info', 'o4vci', `Credential Offer URI wird abgerufen: ${offerUri}`);
      const res = await fetch(offerUri);
      if (res.ok) {
        const data = (await res.json()) as Record<string, unknown>;
        log?.('info', 'o4vci', 'Credential Offer URI erfolgreich geladen', data);
        const issuer = String(data.credential_issuer ?? initial.credential_issuer);
        const { issuer: cleanIssuer, notificationEndpoint } = extractIssuerFromOfferUri(issuer);

        return {
          credential_issuer: cleanIssuer,
          credential_configuration_ids: Array.isArray(data.credential_configuration_ids)
            ? data.credential_configuration_ids.map(String)
            : initial.credential_configuration_ids,
          grants: (data.grants as CredentialOffer['grants']) ?? initial.grants,
          display_name: String(data.display_name ?? 'EUDI Playground Credential Offer'),
          notification_endpoint: String(data.notification_endpoint ?? notificationEndpoint),
        };
      } else {
        log?.('warn', 'o4vci', `Credential Offer URI HTTP ${res.status} (evtl. abgelaufen/404). Verwende Basis-Issuer Fallback.`, {
          status: res.status,
          offerUri,
        });
      }
    } catch (err) {
      log?.('warn', 'o4vci', 'Credential Offer URI konnte nicht geladen werden (CORS/Netzwerk). Verwende Fallback.', {
        error: String(err),
      });
    }
  }

  return initial;
}
