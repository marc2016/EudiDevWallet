import { SignJWT, generateKeyPair, importPKCS8, exportJWK, type JWK } from 'jose';
import mockIssuer from '../fixtures/mock-issuer-key.json';

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function sha256Base64Url(input: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return bytesToBase64Url(new Uint8Array(digest));
}

let cachedIssuerKey: CryptoKey | null = null;
let cachedHolderKey: CryptoKey | null = null;
let cachedHolderJwk: JWK | null = null;

async function getIssuerKey(): Promise<CryptoKey> {
  if (cachedIssuerKey) return cachedIssuerKey;
  cachedIssuerKey = await importPKCS8(mockIssuer.issuerPkcs8, 'ES256');
  return cachedIssuerKey;
}

async function getHolderKey(): Promise<{ privateKey: CryptoKey; publicJwk: JWK }> {
  if (cachedHolderKey && cachedHolderJwk) {
    return { privateKey: cachedHolderKey, publicJwk: cachedHolderJwk };
  }
  const { privateKey, publicKey } = await generateKeyPair('ES256', { extractable: true });
  const publicJwk = await exportJWK(publicKey);
  publicJwk.alg = 'ES256';
  cachedHolderKey = privateKey;
  cachedHolderJwk = publicJwk;
  return { privateKey, publicJwk: publicJwk };
}

export interface MockSdJwtOptions {
  claims: Record<string, string>;
  nonce?: string;
  audience?: string;
  vct?: string;
}

/**
 * SD-JWT VC presentation with x5c header (self-signed mock issuer).
 * Passes structural checks; production verifiers still reject without trust-list match.
 */
export async function buildMockSdJwtVpToken(options: MockSdJwtOptions): Promise<string> {
  const issuerKey = await getIssuerKey();
  const { privateKey: holderKey, publicJwk: holderJwk } = await getHolderKey();

  const issuerJwt = await new SignJWT({
    ...options.claims,
    vct: options.vct ?? 'urn:eudi:pid:de:1',
    cnf: { jwk: holderJwk },
  })
    .setProtectedHeader({
      alg: 'ES256',
      typ: 'dc+sd-jwt',
      x5c: mockIssuer.x5c,
    })
    .setIssuer('https://pocketeudiwallet.dev/mock-issuer')
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(issuerKey);

  const sdHash = await sha256Base64Url(`${issuerJwt}~`);

  const kbPayload: Record<string, unknown> = {
    sd_hash: sdHash,
    cnf: { jwk: holderJwk },
  };
  if (options.nonce) kbPayload.nonce = options.nonce;
  if (options.audience) kbPayload.aud = options.audience;

  const kbJwt = await new SignJWT(kbPayload)
    .setProtectedHeader({ alg: 'ES256', typ: 'kb+jwt' })
    .setIssuedAt()
    .sign(holderKey);

  return `${issuerJwt}~${kbJwt}`;
}
