import { ISSUANCE_PRESETS } from '../data/issuancePresets';
import type { CredentialOffer } from '../types/openid4vci';
import type { CredentialDisplayMetadata } from '../types/openid4vp';

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

export async function fetchIssuerCredentialMetadata(
  credentialIssuer: string,
  configIds: string[],
  log?: (level: 'info' | 'warn' | 'error' | 'success', category: any, message: string, details?: unknown) => void
): Promise<CredentialDisplayMetadata | undefined> {
  if (!credentialIssuer.startsWith('http')) return undefined;

  const candidateUrls: string[] = [];

  try {
    const url = new URL(credentialIssuer);
    if (url.pathname && url.pathname !== '/') {
      candidateUrls.push(`${url.origin}/.well-known/openid-credential-issuer${url.pathname.replace(/\/+$/, '')}`);
    }
  } catch {
    // ignore
  }

  const cleanIssuer = credentialIssuer.replace(/\/+$/, '');
  candidateUrls.push(`${cleanIssuer}/.well-known/openid-credential-issuer`);
  candidateUrls.push(`${cleanIssuer}/.well-known/openid-configuration`);

  if (cleanIssuer.endsWith('/vci')) {
    const parent = cleanIssuer.replace(/\/vci$/, '');
    candidateUrls.push(`${parent}/.well-known/openid-credential-issuer`);
  }

  for (const metadataUrl of candidateUrls) {
    try {
      const res = await fetch(metadataUrl);
      if (res.ok) {
        const data = await res.json();
        const display = extractDisplayFromMetadata(data, configIds);
        if (display) {
          log?.('success', 'o4vci', `OpenID Issuer Metadata (Bilder & Design) von ${metadataUrl} geladen`, {
            name: display.name,
            logoUrl: display.logoUrl,
            backgroundImageUrl: display.backgroundImageUrl,
            backgroundColor: display.backgroundColor,
          });
          return display;
        }
      }
    } catch {
      // ignore
    }
  }

  return undefined;
}

function extractDisplayFromMetadata(
  metadata: unknown,
  configIds: string[]
): CredentialDisplayMetadata | undefined {
  if (!metadata || typeof metadata !== 'object' || metadata === null) return undefined;
  const metaObj = metadata as Record<string, unknown>;

  const configs = (metaObj.credential_configurations_supported || metaObj.credentials_supported) as
    | Record<string, unknown>
    | undefined;
  if (!configs || typeof configs !== 'object') return undefined;

  let matchedConfig: Record<string, unknown> | undefined = undefined;
  for (const id of configIds) {
    if (configs[id] && typeof configs[id] === 'object') {
      matchedConfig = configs[id] as Record<string, unknown>;
      break;
    }
  }

  if (!matchedConfig) {
    const firstKey = Object.keys(configs)[0];
    if (firstKey && typeof configs[firstKey] === 'object') {
      matchedConfig = configs[firstKey] as Record<string, unknown>;
    }
  }

  if (!matchedConfig) return undefined;

  const credMetadata = matchedConfig.credential_metadata as Record<string, unknown> | undefined;
  const displayList = (credMetadata?.display || matchedConfig.display) as Array<Record<string, unknown>> | undefined;

  if (!Array.isArray(displayList) || displayList.length === 0) return undefined;

  const selectedDisplay =
    displayList.find((d) => typeof d.locale === 'string' && d.locale.startsWith('de')) ||
    displayList.find((d) => typeof d.locale === 'string' && d.locale.startsWith('en')) ||
    displayList[0];

  if (!selectedDisplay) return undefined;

  const logoObj = selectedDisplay.logo as Record<string, unknown> | string | undefined;
  const logoUrl = typeof logoObj === 'object' && logoObj !== null ? String(logoObj.uri ?? logoObj.url ?? '') : String(logoObj ?? '');

  const bgObj = selectedDisplay.background_image as Record<string, unknown> | string | undefined;
  const backgroundImageUrl = typeof bgObj === 'object' && bgObj !== null ? String(bgObj.uri ?? bgObj.url ?? '') : String(bgObj ?? '');

  return {
    name: typeof selectedDisplay.name === 'string' ? selectedDisplay.name : undefined,
    locale: typeof selectedDisplay.locale === 'string' ? selectedDisplay.locale : undefined,
    description: typeof selectedDisplay.description === 'string' ? selectedDisplay.description : undefined,
    logoUrl: logoUrl || undefined,
    backgroundImageUrl: backgroundImageUrl || undefined,
    backgroundColor: typeof selectedDisplay.background_color === 'string' ? selectedDisplay.background_color : undefined,
    textColor: typeof selectedDisplay.text_color === 'string' ? selectedDisplay.text_color : undefined,
  };
}

export async function resolveCredentialOfferAsync(
  input: string,
  log?: (level: 'info' | 'warn' | 'error' | 'success', category: any, message: string, details?: unknown) => void
): Promise<CredentialOffer> {
  let offer = parseCredentialOffer(input);

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
        const issuer = String(data.credential_issuer ?? offer.credential_issuer);
        const { issuer: cleanIssuer, notificationEndpoint } = extractIssuerFromOfferUri(issuer);

        offer = {
          credential_issuer: cleanIssuer,
          credential_configuration_ids: Array.isArray(data.credential_configuration_ids)
            ? data.credential_configuration_ids.map(String)
            : offer.credential_configuration_ids,
          grants: (data.grants as CredentialOffer['grants']) ?? offer.grants,
          display_name: String(data.display_name ?? offer.display_name ?? 'EUDI Playground Credential Offer'),
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

  const displayMetadata = await fetchIssuerCredentialMetadata(
    offer.credential_issuer,
    offer.credential_configuration_ids,
    log
  );

  if (displayMetadata) {
    offer.display = displayMetadata;
    if (displayMetadata.name) {
      offer.display_name = displayMetadata.name;
    }
  }

  return offer;
}
