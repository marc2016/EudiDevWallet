import { describe, expect, it } from 'vitest';
import { validateCertificates } from '../validateCertificates';
import type { AuthorizationRequest } from '../../types/openid4vp';

// Helper to create a base64 DER string simulating ASN.1 printable strings for WRPAC
function mockWrpacDer(subject: string, issuer: string, sans: string[]): string {
  const content = `${subject}\n${issuer}\n${sans.join('\n')}`;
  return btoa(content);
}

describe('validateCertificates', () => {
  it('should return valid when certificate mode is off', async () => {
    const req: AuthorizationRequest = { client_id: 'test' };
    const res = await validateCertificates(req, 'off');
    expect(res.valid).toBe(true);
    expect(res.blocksApproval).toBe(false);
  });

  it('should fail presence check in strict mode when WRPAC is missing', async () => {
    const req: AuthorizationRequest = { client_id: 'test' };
    const res = await validateCertificates(req, 'strict');
    expect(res.valid).toBe(false);
    expect(res.blocksApproval).toBe(true);
    expect(res.messages).toContain('Fehler: WRPAC-Zertifikat (x5c) fehlt in der Anfrage (in strikter Prüfung erforderlich)');
  });

  describe('WRPAC SAN Match', () => {
    it('should pass SAN match when client_id matches certificate SAN', async () => {
      const der = mockWrpacDer('CN=verifier.example.com', 'CN=EUDI Trust CA', ['verifier.example.com']);
      const req: AuthorizationRequest = {
        client_id: 'x509_san_dns:verifier.example.com',
        requestJwt: 'header.payload.sig',
        requestJwtHeader: { x5c: [der] },
      };

      const res = await validateCertificates(req, 'strict', 'eudi_ca');
      expect(res.clientIdMatchValid).toBe(true);
      expect(res.messages.some((m) => m.includes('stimmt exakt mit Zertifikat-SAN überein'))).toBe(true);
    });

    it('should fail SAN match in strict mode when client_id does not match SAN', async () => {
      const der = mockWrpacDer('CN=legit.com', 'CN=EUDI Trust CA', ['legit.com']);
      const req: AuthorizationRequest = {
        client_id: 'x509_san_dns:malicious.com',
        requestJwt: 'header.payload.sig',
        requestJwtHeader: { x5c: [der] },
      };

      const res = await validateCertificates(req, 'strict', 'eudi_ca');
      expect(res.clientIdMatchValid).toBe(false);
      expect(res.blocksApproval).toBe(true);
      expect(res.valid).toBe(false);
    });
  });

  describe('WRPRC Scope & Attribute Validation', () => {
    it('should pass scope check when all requested attributes are covered by WRPRC', async () => {
      const der = mockWrpacDer('CN=verifier.com', 'CN=EUDI Trust CA', ['verifier.com']);
      const req: AuthorizationRequest = {
        client_id: 'x509_san_dns:verifier.com',
        requestJwt: 'header.payload.sig',
        requestJwtHeader: { x5c: [der] },
        rawParams: {
          registration_certificate: JSON.stringify({
            sub: 'CN=verifier.com',
            authorized_scopes: ['given_name', 'family_name'],
          }),
        },
        presentation_definition: {
          input_descriptors: [
            {
              id: 'pid',
              constraints: {
                fields: [
                  { path: ['$.credentialSubject.given_name'] },
                  { path: ['$.credentialSubject.family_name'] },
                ],
              },
            },
          ],
        },
      };

      const res = await validateCertificates(req, 'strict', 'eudi_ca');
      expect(res.wrprcScopeValid).toBe(true);
      expect(res.messages.some((m) => m.includes('Scope-Prüfung erfolgreich'))).toBe(true);
    });

    it('should fail scope check in strict mode when requesting attributes not in WRPRC', async () => {
      const der = mockWrpacDer('CN=verifier.com', 'CN=EUDI Trust CA', ['verifier.com']);
      const req: AuthorizationRequest = {
        client_id: 'x509_san_dns:verifier.com',
        requestJwt: 'header.payload.sig',
        requestJwtHeader: { x5c: [der] },
        rawParams: {
          registration_certificate: JSON.stringify({
            sub: 'CN=verifier.com',
            authorized_scopes: ['given_name', 'family_name'],
          }),
        },
        presentation_definition: {
          input_descriptors: [
            {
              id: 'pid',
              constraints: {
                fields: [
                  { path: ['$.credentialSubject.given_name'] },
                  { path: ['$.credentialSubject.portrait'] },
                ],
              },
            },
          ],
        },
      };

      const res = await validateCertificates(req, 'strict', 'eudi_ca');
      expect(res.wrprcScopeValid).toBe(false);
      expect(res.blocksApproval).toBe(true);
      expect(res.valid).toBe(false);
      expect(res.messages.some((m) => m.includes('Scope-Prüfung fehlgeschlagen'))).toBe(true);
    });
  });

  describe('Configurable Trust Anchor Validation', () => {
    it('should pass trust anchor check for official EUDI CAs in eudi_ca mode', async () => {
      const der = mockWrpacDer('CN=verifier.com', 'CN=DE EUDI Wallet RP CA', ['verifier.com']);
      const req: AuthorizationRequest = {
        client_id: 'x509_san_dns:verifier.com',
        requestJwt: 'header.payload.sig',
        requestJwtHeader: { x5c: [der] },
      };

      const res = await validateCertificates(req, 'strict', 'eudi_ca');
      expect(res.trustAnchorValid).toBe(true);
      expect(res.messages.some((m) => m.includes('offiziellen EUDI Trust List'))).toBe(true);
    });

    it('should fail trust anchor check in strict mode for untrusted CA in eudi_ca mode', async () => {
      const der = mockWrpacDer('CN=verifier.com', 'CN=Untrusted SelfSigned CA', ['verifier.com']);
      const req: AuthorizationRequest = {
        client_id: 'x509_san_dns:verifier.com',
        requestJwt: 'header.payload.sig',
        requestJwtHeader: { x5c: [der] },
      };

      const res = await validateCertificates(req, 'strict', 'eudi_ca');
      expect(res.trustAnchorValid).toBe(false);
      expect(res.blocksApproval).toBe(true);
      expect(res.valid).toBe(false);
    });

    it('should pass trust anchor check matching custom trust anchors in custom mode', async () => {
      const der = mockWrpacDer('CN=verifier.com', 'CN=My Custom Root CA', ['verifier.com']);
      const req: AuthorizationRequest = {
        client_id: 'x509_san_dns:verifier.com',
        requestJwt: 'header.payload.sig',
        requestJwtHeader: { x5c: [der] },
      };

      const res = await validateCertificates(req, 'strict', 'custom', 'My Custom Root CA');
      expect(res.trustAnchorValid).toBe(true);
      expect(res.messages.some((m) => m.includes('benutzerdefinierte CAs bestätigt'))).toBe(true);
    });

    it('should accept any issuer in mock mode', async () => {
      const der = mockWrpacDer('CN=verifier.com', 'CN=Random Untrusted CA', ['verifier.com']);
      const req: AuthorizationRequest = {
        client_id: 'x509_san_dns:verifier.com',
        requestJwt: 'header.payload.sig',
        requestJwtHeader: { x5c: [der] },
      };

      const res = await validateCertificates(req, 'strict', 'mock');
      expect(res.trustAnchorValid).toBe(true);
      expect(res.messages.some((m) => m.includes('Mock- / Dev-Modus aktiv'))).toBe(true);
    });
  });
});
