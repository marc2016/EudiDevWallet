import type { AuthorizationRequest } from '../types/openid4vp';
import type { LogFn } from '../types/openid4vp';

function parseQueryString(input: string): URLSearchParams {
  const trimmed = input.trim();
  if (!trimmed) return new URLSearchParams();

  try {
    if (trimmed.includes('://') || trimmed.startsWith('?')) {
      const url = trimmed.startsWith('?') ? `http://local${trimmed}` : trimmed;
      const u = new URL(url);
      return u.searchParams;
    }
  } catch {
    // fall through
  }

  const q = trimmed.startsWith('?') ? trimmed.slice(1) : trimmed;
  return new URLSearchParams(q);
}

function paramsToRecord(params: URLSearchParams): Record<string, string> {
  const out: Record<string, string> = {};
  params.forEach((v, k) => {
    out[k] = v;
  });
  return out;
}

function parseJsonField<T>(value: string | undefined): T | undefined {
  if (!value) return undefined;
  try {
    return JSON.parse(value) as T;
  } catch {
    return undefined;
  }
}

export function parseRequestInput(input: string, log?: LogFn): AuthorizationRequest {
  const params = parseQueryString(input);
  const rawParams = paramsToRecord(params);

  log?.('info', 'parse', 'Query-Parameter extrahiert', rawParams);

  const presentation_definition = parseJsonField<AuthorizationRequest['presentation_definition']>(
    params.get('presentation_definition') ?? undefined,
  );
  const dcql_query = parseJsonField<AuthorizationRequest['dcql_query']>(
    params.get('dcql_query') ?? undefined,
  );
  const client_metadata = parseJsonField<Record<string, unknown>>(
    params.get('client_metadata') ?? undefined,
  );

  return {
    client_id: params.get('client_id') ?? undefined,
    response_uri: params.get('response_uri') ?? undefined,
    response_mode: params.get('response_mode') ?? undefined,
    response_type: params.get('response_type') ?? undefined,
    nonce: params.get('nonce') ?? undefined,
    state: params.get('state') ?? undefined,
    presentation_definition,
    presentation_definition_uri: params.get('presentation_definition_uri') ?? undefined,
    dcql_query,
    request_uri: params.get('request_uri') ?? undefined,
    client_metadata,
    client_metadata_uri: params.get('client_metadata_uri') ?? undefined,
    rawParams,
  };
}

export function mergeAuthorizationRequest(
  base: AuthorizationRequest,
  jwtPayload: Record<string, unknown>,
  jwtHeader?: Record<string, unknown>,
  requestJwt?: string,
): AuthorizationRequest {
  const pd =
    typeof jwtPayload.presentation_definition === 'object' &&
    jwtPayload.presentation_definition !== null
      ? (jwtPayload.presentation_definition as AuthorizationRequest['presentation_definition'])
      : base.presentation_definition;

  const dcql =
    typeof jwtPayload.dcql_query === 'object' && jwtPayload.dcql_query !== null
      ? (jwtPayload.dcql_query as AuthorizationRequest['dcql_query'])
      : typeof jwtPayload.dcql_query === 'string'
        ? parseJsonField<AuthorizationRequest['dcql_query']>(jwtPayload.dcql_query)
        : base.dcql_query;

  const cm =
    typeof jwtPayload.client_metadata === 'object' && jwtPayload.client_metadata !== null
      ? (jwtPayload.client_metadata as Record<string, unknown>)
      : typeof jwtPayload.client_metadata === 'string'
        ? parseJsonField<Record<string, unknown>>(jwtPayload.client_metadata)
        : base.client_metadata;

  return {
    ...base,
    client_id: (jwtPayload.client_id as string) ?? base.client_id,
    response_uri: (jwtPayload.response_uri as string) ?? base.response_uri,
    response_mode: (jwtPayload.response_mode as string) ?? base.response_mode,
    response_type: (jwtPayload.response_type as string) ?? base.response_type,
    nonce: (jwtPayload.nonce as string) ?? base.nonce,
    state: (jwtPayload.state as string) ?? base.state,
    presentation_definition: pd,
    presentation_definition_uri:
      (jwtPayload.presentation_definition_uri as string) ?? base.presentation_definition_uri,
    dcql_query: dcql,
    client_metadata: cm,
    client_metadata_uri:
      (jwtPayload.client_metadata_uri as string) ?? base.client_metadata_uri,
    requestJwt,
    requestJwtHeader: jwtHeader,
    requestJwtPayload: jwtPayload,
  };
}
