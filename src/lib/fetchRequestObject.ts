import { decodeJwt, decodeProtectedHeader } from 'jose';
import {
  mergeAuthorizationRequest,
  parseRequestInput,
} from './parseRequest';
import type { AuthorizationRequest, LogFn } from '../types/openid4vp';

async function fetchPresentationDefinition(uri: string, log?: LogFn) {
  const start = performance.now();
  try {
    const res = await fetch(uri);
    const duration = Math.round(performance.now() - start);
    log?.('info', 'fetch', `presentation_definition_uri → ${res.status}`, {
      url: uri,
      status: res.status,
      durationMs: duration,
    });
    if (!res.ok) return undefined;
    return (await res.json()) as AuthorizationRequest['presentation_definition'];
  } catch (err) {
    log?.('error', 'fetch', 'presentation_definition_uri fehlgeschlagen', {
      url: uri,
      error: String(err),
    });
    return undefined;
  }
}

export async function fetchRequestObject(
  requestUri: string,
  log?: LogFn,
): Promise<{ jwt: string; header: Record<string, unknown>; payload: Record<string, unknown> }> {
  const start = performance.now();
  const res = await fetch(requestUri);
  const duration = Math.round(performance.now() - start);
  const headers: Record<string, string> = {};
  res.headers.forEach((v, k) => {
    headers[k] = v;
  });

  if (!res.ok) {
    log?.('error', 'fetch', `request_uri → HTTP ${res.status}`, {
      url: requestUri,
      status: res.status,
      durationMs: duration,
      headers,
    });
    throw new Error(`request_uri HTTP ${res.status}`);
  }

  const jwt = (await res.text()).trim();
  log?.('info', 'fetch', `request_uri → ${res.status}`, {
    url: requestUri,
    status: res.status,
    durationMs: duration,
    headers,
    jwtPreview: jwt.slice(0, 80) + '…',
  });

  const header = decodeProtectedHeader(jwt) as Record<string, unknown>;
  const payload = decodeJwt(jwt) as Record<string, unknown>;
  log?.('info', 'parse', 'JWT dekodiert', { header, payload });

  return { jwt, header, payload };
}

export async function resolveAuthorizationRequest(
  input: string,
  log?: LogFn,
): Promise<AuthorizationRequest> {
  log?.('info', 'parse', 'Analyse gestartet', {
    inputPreview: input.trim().slice(0, 200),
  });

  let request = parseRequestInput(input, log);

  if (request.request_uri) {
    const { jwt, header, payload } = await fetchRequestObject(request.request_uri, log);
    request = mergeAuthorizationRequest(request, payload, header, jwt);
  }

  if (request.presentation_definition_uri && !request.presentation_definition) {
    const pd = await fetchPresentationDefinition(request.presentation_definition_uri, log);
    if (pd) request = { ...request, presentation_definition: pd };
  }

  return request;
}
