import { encode, Tagged } from 'cborg';
import { importPKCS8, calculateJwkThumbprint } from 'jose';
import mockIssuer from '../fixtures/mock-issuer-key.json';
import mockDevice from '../fixtures/mock-device-key.json';
import type { AuthorizationRequest } from '../types/openid4vp';
import { parseClientMetadata, selectEncryptionJwk } from './parseClientMetadata';

let cachedIssuerKey: CryptoKey | null = null;
let cachedDeviceKey: CryptoKey | null = null;

async function getIssuerKey(): Promise<CryptoKey> {
  if (cachedIssuerKey) return cachedIssuerKey;
  cachedIssuerKey = await importPKCS8(mockIssuer.issuerPkcs8, 'ES256');
  return cachedIssuerKey;
}

async function getDeviceKey(): Promise<CryptoKey> {
  if (cachedDeviceKey) return cachedDeviceKey;
  cachedDeviceKey = await importPKCS8(mockDevice.devicePkcs8, 'ES256');
  return cachedDeviceKey;
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function base64UrlToBytes(b64url: string): Uint8Array {
  const padded = b64url + '='.repeat((4 - (b64url.length % 4)) % 4);
  return base64ToBytes(padded.replace(/-/g, '+').replace(/_/g, '/'));
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function sha256(data: Uint8Array): Promise<Uint8Array> {
  const digest = await crypto.subtle.digest('SHA-256', data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer);
  return new Uint8Array(digest);
}

function cborDate(iso: string): Tagged {
  return new Tagged(0, iso);
}

function wrapCborTag24(inner: Uint8Array): Uint8Array {
  return new Uint8Array(encode(new Tagged(24, inner)));
}

function buildDeviceCoseKey(): Map<number, number | Uint8Array> {
  const key = new Map<number, number | Uint8Array>();
  key.set(1, 2);
  key.set(-1, 1);
  key.set(-2, base64UrlToBytes(mockDevice.coseX));
  key.set(-3, base64UrlToBytes(mockDevice.coseY));
  return key;
}

interface IssuerSignedItemResult {
  tagged: Tagged;
  taggedBytes: Uint8Array;
  digestId: number;
}

function buildIssuerSignedItem(
  elementIdentifier: string,
  elementValue: string,
  digestId: number,
): IssuerSignedItemResult {
  const item = {
    digestID: digestId,
    random: crypto.getRandomValues(new Uint8Array(24)),
    elementIdentifier,
    elementValue,
  };
  const inner = encode(item);
  const taggedBytes = wrapCborTag24(inner);
  return {
    tagged: new Tagged(24, inner),
    taggedBytes,
    digestId,
  };
}

function buildMso(
  docType: string,
  digests: Map<number, Uint8Array>,
): Record<string, unknown> {
  const now = new Date().toISOString();
  const later = new Date(Date.now() + 365 * 86_400_000).toISOString();

  return {
    version: '1.0',
    digestAlgorithm: 'SHA-256',
    valueDigests: {
      [docType]: digests,
    },
    deviceKeyInfo: {
      deviceKey: buildDeviceCoseKey(),
    },
    docType,
    validityInfo: {
      signed: cborDate(now),
      validFrom: cborDate(now),
      validUntil: cborDate(later),
    },
  };
}

async function buildIssuerAuth(
  docType: string,
  digests: Map<number, Uint8Array>,
): Promise<unknown[]> {
  const mso = buildMso(docType, digests);
  const certDer = base64ToBytes(mockIssuer.x5c[0]);

  const protectedMap = new Map<number, unknown>();
  protectedMap.set(1, -7);

  const unprotectedMap = new Map<number, unknown>();
  unprotectedMap.set(33, certDer);

  const protectedBytes = encode(protectedMap);
  const payloadBytes = encode(new Tagged(24, encode(mso)));
  const sigStructure = ['Signature1', protectedBytes, new Uint8Array(0), payloadBytes];
  const toSign = new Uint8Array(encode(sigStructure));

  const issuerKey = await getIssuerKey();
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    issuerKey,
    toSign,
  );

  return [protectedBytes, unprotectedMap, payloadBytes, new Uint8Array(signature)];
}

export interface MdocSessionContext {
  clientId: string;
  nonce: string;
  responseUri?: string;
  jwkThumbprint?: Uint8Array | null;
}

export interface MockMdocOptions {
  claims: Record<string, string>;
  docType?: string;
  session?: MdocSessionContext;
}

async function resolveJwkThumbprint(request: AuthorizationRequest): Promise<Uint8Array | null> {
  const metadata = parseClientMetadata(request);
  const jwk = selectEncryptionJwk(metadata);
  if (!jwk) return null;
  const thumbprint = await calculateJwkThumbprint(jwk);
  return base64UrlToBytes(thumbprint);
}

export function mdocSessionFromRequest(request: AuthorizationRequest): MdocSessionContext {
  return {
    clientId: request.client_id ?? '',
    nonce: request.nonce ?? '',
    responseUri: request.response_uri,
    jwkThumbprint: null,
  };
}

async function buildSessionTranscript(session: MdocSessionContext): Promise<unknown[]> {
  const handoverInfo = [
    session.clientId,
    session.nonce,
    session.jwkThumbprint ?? null,
    session.responseUri ?? null,
  ];
  const handoverInfoBytes = encode(handoverInfo);
  const infoHash = await sha256(handoverInfoBytes);
  const handover = ['OpenID4VPHandover', infoHash];
  return [null, null, handover];
}

async function buildDeviceAuthBytes(
  sessionTranscript: unknown[],
  docType: string,
): Promise<Uint8Array> {
  const deviceAuthentication = [
    'DeviceAuthentication',
    sessionTranscript,
    docType,
    new Tagged(24, encode({})),
  ];
  // Return the CBOR-encoded bytes (will be used as COSE payload)
  return new Uint8Array(encode(deviceAuthentication));
}

async function buildDeviceSignature(deviceAuthBytes: Uint8Array): Promise<unknown[]> {
  const protectedMap = new Map<number, unknown>();
  protectedMap.set(1, -7);
  const protectedBytes = encode(protectedMap);
  const sigStructure = ['Signature1', protectedBytes, new Uint8Array(0), deviceAuthBytes];
  const toSign = new Uint8Array(encode(sigStructure));

  const deviceKey = await getDeviceKey();
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    deviceKey,
    toSign,
  );

  return [protectedBytes, new Map<number, unknown>(), deviceAuthBytes, new Uint8Array(signature)];
}

/**
 * ISO 18013-5 DeviceResponse as base64url vp_token (mso_mdoc).
 * Includes issuer-signed items with matching MSO digests and OID4VP device authentication.
 */
export async function buildMockMdocVpToken(options: MockMdocOptions): Promise<string> {
  const docType = options.docType ?? 'eu.europa.ec.eudi.pid.1';
  const entries = Object.entries(options.claims);
  const digests = new Map<number, Uint8Array>();

  const itemResults = await Promise.all(
    entries.map(async ([key, value], index) => {
      const built = buildIssuerSignedItem(key, value, index);
      const digest = await sha256(built.taggedBytes);
      digests.set(built.digestId, digest);
      return built.tagged;
    }),
  );

  const session = options.session;

  let deviceSigned: Record<string, unknown> | undefined;
  if (session?.clientId && session.nonce) {
    const sessionTranscript = await buildSessionTranscript(session);
    const deviceAuthBytes = await buildDeviceAuthBytes(sessionTranscript, docType);
    const deviceSignature = await buildDeviceSignature(deviceAuthBytes);
    
    deviceSigned = {
      nameSpaces: {},  // Empty object (becomes CBOR map)
      deviceAuth: deviceSignature,
    };
  }

  const issuerSigned: Record<string, unknown> = {
    nameSpaces: {
      [docType]: itemResults,
    },
    issuerAuth: await buildIssuerAuth(docType, digests),
  };

  const document: Record<string, unknown> = {
    docType,
    issuerSigned,
  };

  if (deviceSigned) {
    document.deviceSigned = deviceSigned;
  }

  // For OID4VP vp_token, return just the document (not wrapped in DeviceResponse)
  return bytesToBase64Url(encode(document));
}

export async function buildMockMdocVpTokenFromRequest(
  request: AuthorizationRequest,
  claims: Record<string, string>,
  docType?: string,
): Promise<string> {
  const session = mdocSessionFromRequest(request);
  const thumbprint = await resolveJwkThumbprint(request);
  if (thumbprint) {
    session.jwkThumbprint = thumbprint;
  }
  return buildMockMdocVpToken({ claims, docType, session });
}
