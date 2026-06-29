import { EncryptJWT, importJWK } from 'jose';
import type { AuthorizationRequest } from '../types/openid4vp';
import {
  parseClientMetadata,
  selectEncAlgorithm,
  selectEncryptionJwk,
} from './parseClientMetadata';

export async function encryptDirectPostJwtResponse(
  request: AuthorizationRequest,
  vpToken: string,
): Promise<string> {
  const metadata = parseClientMetadata(request);
  const jwk = selectEncryptionJwk(metadata);
  if (!jwk) {
    throw new Error(
      'direct_post.jwt erfordert client_metadata.jwks in der Anfrage — Verschlüsselung nicht möglich',
    );
  }

  const enc = selectEncAlgorithm(metadata);
  const key = await importJWK(jwk, 'ECDH-ES');
  const credentialId =
    request.dcql_query?.credentials?.[0]?.id ??
    request.presentation_definition?.input_descriptors?.[0]?.id ??
    'credential';

  const payload: Record<string, unknown> = {
    vp_token: { [credentialId]: [vpToken] },
    state: request.state ?? '',
  };

  return new EncryptJWT(payload)
    .setProtectedHeader({
      alg: 'ECDH-ES',
      enc,
      ...(jwk.kid ? { kid: String(jwk.kid) } : {}),
    })
    .setIssuedAt()
    .setExpirationTime('2h')
    .encrypt(key);
}
