import { MOCK_VP_TOKEN_PREFIX } from '../log/activityLog';
import type { AuthorizationRequest, BuiltResponse } from '../types/openid4vp';

function base64urlJson(obj: unknown): string {
  const json = JSON.stringify(obj);
  return btoa(json).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function buildMockVpToken(claims: Record<string, string>, nonce?: string): string {
  const payload = {
    _mock: true,
    credentialSubject: claims,
    nonce,
  };
  const header = base64urlJson({ alg: 'none', typ: 'vp+jwt' });
  const body = base64urlJson(payload);
  return `${MOCK_VP_TOKEN_PREFIX}${header}.${body}.`;
}

function buildPresentationSubmission(request: AuthorizationRequest) {
  const defId = request.presentation_definition?.id ?? 'pd';
  const inputId =
    request.presentation_definition?.input_descriptors?.[0]?.id ?? 'input_0';
  return {
    id: `ps-${Date.now()}`,
    definition_id: defId,
    descriptor_map: [
      {
        id: inputId,
        format: 'dc+sd-jwt',
        path: '$',
      },
    ],
  };
}

function buildUnsignedJwt(payload: Record<string, unknown>): string {
  const header = base64urlJson({ alg: 'none', typ: 'oauth-authz-resp+jwt' });
  const body = base64urlJson(payload);
  return `${header}.${body}.`;
}

export async function buildResponse(
  request: AuthorizationRequest,
  claims: Record<string, string>,
  mode: 'direct_post' | 'direct_post_jwt' | 'raw_json',
): Promise<BuiltResponse> {
  const vpToken = buildMockVpToken(claims, request.nonce);
  const presentationSubmission = buildPresentationSubmission(request);
  const state = request.state ?? '';

  if (mode === 'raw_json') {
    return {
      contentType: 'application/json',
      body: {
        ...claims,
        nonce: request.nonce,
        state,
        _mock: true,
      },
      mode,
    };
  }

  if (mode === 'direct_post_jwt') {
    const inner = buildUnsignedJwt({
      vp_token: vpToken,
      presentation_submission: presentationSubmission,
      state,
    });
    const params = new URLSearchParams({ response: inner });
    return {
      contentType: 'application/x-www-form-urlencoded',
      body: params.toString(),
      mode,
    };
  }

  const params = new URLSearchParams({
    vp_token: vpToken,
    presentation_submission: JSON.stringify(presentationSubmission),
    state,
  });

  return {
    contentType: 'application/x-www-form-urlencoded',
    body: params.toString(),
    mode: 'direct_post',
  };
}
