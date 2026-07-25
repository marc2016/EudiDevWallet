import { describe, expect, it } from 'vitest';
import { extractClaims } from '../extractClaims';
import type { AuthorizationRequest } from '../../types/openid4vp';

describe('extractClaims', () => {
  it('should extract claims from presentation_definition with explicit essential: true', () => {
    const req: AuthorizationRequest = {
      client_id: 'test-verifier',
      presentation_definition: {
        id: 'pd-1',
        input_descriptors: [
          {
            id: 'pid',
            constraints: {
              fields: [
                { path: ['$.credentialSubject.given_name'], essential: true },
                { path: ['$.credentialSubject.email'], optional: true },
              ],
            },
          },
        ],
      },
    };

    const claims = extractClaims(req);
    expect(claims).toHaveLength(2);
    
    const givenName = claims.find((c) => c.key === 'given_name');
    expect(givenName).toBeDefined();
    expect(givenName?.essential).toBe(true);

    const email = claims.find((c) => c.key === 'email');
    expect(email).toBeDefined();
    expect(email?.essential).toBe(false);
  });

  it('should extract claims from DCQL query with explicit essential/optional fields', () => {
    const req: AuthorizationRequest = {
      client_id: 'test-verifier',
      dcql_query: {
        credentials: [
          {
            id: 'pid',
            format: 'dc+sd-jwt',
            claims: [
              { path: ['family_name'], essential: true },
              { path: ['phone_number'], optional: true },
            ],
          },
        ],
      },
    };

    const claims = extractClaims(req);
    expect(claims).toHaveLength(2);

    const familyName = claims.find((c) => c.key === 'family_name');
    expect(familyName?.essential).toBe(true);

    const phone = claims.find((c) => c.key === 'phone_number');
    expect(phone?.essential).toBe(false);
  });

  it('should apply default PID heuristics when essential/optional are omitted', () => {
    const req: AuthorizationRequest = {
      client_id: 'test-verifier',
      presentation_definition: {
        id: 'pd-1',
        input_descriptors: [
          {
            id: 'pid',
            constraints: {
              fields: [
                { path: ['$.credentialSubject.given_name'] },
                { path: ['$.credentialSubject.email'] },
              ],
            },
          },
        ],
      },
    };

    const claims = extractClaims(req);
    expect(claims.find((c) => c.key === 'given_name')?.essential).toBe(true);
    expect(claims.find((c) => c.key === 'email')?.essential).toBe(false);
  });
});
