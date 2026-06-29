import type { AuthorizationRequest } from '../types/openid4vp';

export interface ClientMetadata {
  jwks?: { keys: Record<string, unknown>[] };
  encrypted_response_enc_values_supported?: string[];
}

export function parseClientMetadata(
  request: AuthorizationRequest,
): ClientMetadata | undefined {
  const raw =
    request.requestJwtPayload?.client_metadata ?? request.rawParams?.client_metadata;
  if (!raw) return undefined;
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as ClientMetadata;
    } catch {
      return undefined;
    }
  }
  if (typeof raw === 'object' && raw !== null) {
    return raw as ClientMetadata;
  }
  return undefined;
}

export function selectEncryptionJwk(
  metadata?: ClientMetadata,
): Record<string, unknown> | undefined {
  const keys = metadata?.jwks?.keys;
  if (!keys?.length) return undefined;

  const encKey = keys.find((k) => k.use === 'enc' || k.use === undefined);
  return encKey ?? keys[0];
}

export function selectEncAlgorithm(metadata?: ClientMetadata): 'A128GCM' | 'A256GCM' {
  const supported = metadata?.encrypted_response_enc_values_supported ?? [];
  if (supported.includes('A128GCM')) return 'A128GCM';
  if (supported.includes('A256GCM')) return 'A256GCM';
  return 'A128GCM';
}

export function getCredentialId(request: AuthorizationRequest): string {
  const fromDcql = request.dcql_query?.credentials?.[0]?.id;
  if (fromDcql) return fromDcql;
  const fromPd = request.presentation_definition?.input_descriptors?.[0]?.id;
  if (fromPd) return fromPd;
  return 'credential';
}
