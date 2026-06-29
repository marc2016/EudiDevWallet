import type { AuthorizationRequest, BuiltResponse } from '../types/openid4vp';
import { buildMockSdJwtVpToken } from './buildMockSdJwt';
import { encryptDirectPostJwtResponse } from './encryptAuthorizationResponse';

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

function resolveVct(request: AuthorizationRequest): string | undefined {
  return request.dcql_query?.credentials?.[0]?.meta?.vct_values?.[0];
}

export async function buildResponse(
  request: AuthorizationRequest,
  claims: Record<string, string>,
  mode: 'direct_post' | 'direct_post_jwt' | 'raw_json',
): Promise<BuiltResponse> {
  const vpToken = await buildMockSdJwtVpToken({
    claims,
    nonce: request.nonce,
    audience: request.client_id,
    vct: resolveVct(request),
  });
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
    const inner = await encryptDirectPostJwtResponse(request, vpToken);
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
