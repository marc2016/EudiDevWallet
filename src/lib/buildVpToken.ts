import type { AuthorizationRequest, VpCredentialFormat } from '../types/openid4vp';
import { buildMockMdocVpTokenFromRequest } from './buildMockMdoc';
import { buildMockSdJwtVpToken } from './buildMockSdJwt';
import { resolveDoctype } from './resolveCredentialFormat';

function resolveVct(request: AuthorizationRequest): string | undefined {
  return request.dcql_query?.credentials?.[0]?.meta?.vct_values?.[0];
}

export async function buildVpToken(
  request: AuthorizationRequest,
  claims: Record<string, string>,
  format: VpCredentialFormat,
): Promise<string> {
  if (format === 'mso_mdoc') {
    return await buildMockMdocVpTokenFromRequest(request, claims, resolveDoctype(request));
  }

  return buildMockSdJwtVpToken({
    claims,
    nonce: request.nonce,
    audience: request.client_id,
    vct: resolveVct(request),
  });
}
