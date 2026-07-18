import type { AuthorizationRequest, BuiltResponse, VpCredentialFormat } from '../types/openid4vp';
import { encryptDirectPostJwtResponse } from './encryptAuthorizationResponse';
import { buildVpToken } from './buildVpToken';

function buildPresentationSubmission(
  request: AuthorizationRequest,
  format: VpCredentialFormat,
) {
  // For DCQL queries, use the credential ID from dcql_query
  // For presentation_definition, use the definition ID
  const hasDcql = !!request.dcql_query?.credentials?.[0];
  const inputId = hasDcql
    ? request.dcql_query?.credentials?.[0]?.id ?? 'credential_0'
    : request.presentation_definition?.input_descriptors?.[0]?.id ?? 'input_0';
  
  const defId = hasDcql
    ? request.dcql_query?.credentials?.[0]?.id ?? 'credential_0'  // For DCQL, definition_id matches credential id
    : request.presentation_definition?.id ?? 'pd';
  
  return {
    id: `ps-${Date.now()}`,
    definition_id: defId,
    descriptor_map: [
      {
        id: inputId,
        format,
        path: '$',
      },
    ],
  };
}

export async function buildResponse(
  request: AuthorizationRequest,
  claims: Record<string, string>,
  mode: 'direct_post' | 'direct_post_jwt' | 'raw_json',
  credentialFormat: VpCredentialFormat,
): Promise<BuiltResponse> {
  const vpToken = await buildVpToken(request, claims, credentialFormat);
  const presentationSubmission = buildPresentationSubmission(request, credentialFormat);
  const state = request.state ?? '';

  if (mode === 'raw_json') {
    return {
      contentType: 'application/json',
      body: {
        ...claims,
        nonce: request.nonce,
        state,
        _mock: true,
        _credentialFormat: credentialFormat,
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

  // Always include state, vp_token, and presentation_submission
  const params = new URLSearchParams({
    vp_token: vpToken,
    presentation_submission: JSON.stringify(presentationSubmission),
  });
  
  // Always include state
  params.set('state', state);

  return {
    contentType: 'application/x-www-form-urlencoded',
    body: params.toString(),
    mode: 'direct_post',
  };
}
