import { SignJWT, CompactEncrypt, importJWK } from 'jose';
import type { AuthorizationRequest } from '../types/openid4vp';
import {
  parseClientMetadata,
  selectEncAlgorithm,
  selectEncryptionJwk,
} from './parseClientMetadata';
import { getHolderKey } from './buildMockSdJwt';

/**
 * Builds a JARM response for `response_mode=direct_post.jwt`.
 *
 * Spec requirement (OID4VP §7.3 / JARM):
 *   response = JWE( JWS(auth_response_claims) )
 *
 * Step 1 – sign an inner JWT with the wallet's holder key containing:
 *   vp_token, presentation_submission, state, iss, aud, iat, exp
 * Step 2 – encrypt that JWT string with the verifier's ECDH-ES public key.
 */
export async function encryptDirectPostJwtResponse(
  request: AuthorizationRequest,
  vpToken: string,
  presentationSubmission: Record<string, unknown>,
): Promise<string> {
  const metadata = parseClientMetadata(request);
  const jwk = selectEncryptionJwk(metadata);
  if (!jwk) {
    throw new Error(
      'direct_post.jwt erfordert client_metadata.jwks in der Anfrage — Verschlüsselung nicht möglich',
    );
  }

  const enc = selectEncAlgorithm(metadata);
  const verifierPublicKey = await importJWK(jwk, 'ECDH-ES');

  const credentialId =
    request.dcql_query?.credentials?.[0]?.id ??
    request.presentation_definition?.input_descriptors?.[0]?.id ??
    'credential';

  // --- Step 1: build and sign the inner JARM JWT ---
  const { privateKey: holderSigningKey } = await getHolderKey();

  const now = Math.floor(Date.now() / 1000);
  const innerJwt = await new SignJWT({
    vp_token: { [credentialId]: vpToken },
    presentation_submission: presentationSubmission,
    state: request.state ?? '',
    iss: 'https://self-issued.me/v2',
    aud: request.client_id ?? request.response_uri ?? '',
  })
    .setProtectedHeader({ alg: 'ES256', typ: 'JWT' })
    .setIssuedAt(now)
    .setExpirationTime(now + 7200)
    .sign(holderSigningKey);

  // --- Step 2: encrypt the signed JWT string as JWE ---
  const jwe = await new CompactEncrypt(new TextEncoder().encode(innerJwt))
    .setProtectedHeader({
      alg: 'ECDH-ES',
      enc,
      cty: 'JWT',
      ...(jwk.kid ? { kid: String(jwk.kid) } : {}),
    })
    .encrypt(verifierPublicKey);

  return jwe;
}
