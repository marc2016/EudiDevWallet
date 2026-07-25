import { describe, expect, it } from 'vitest';
import { isCredentialOfferInput, parseCredentialOffer } from '../parseCredentialOffer';
import { discoverTokenEndpoint, fetchOpenID4VCIAccessToken, generateProofJwt, sendCredentialNotification, simulateIssueCredential } from '../issueCredential';
import { ISSUANCE_PRESETS } from '../../data/issuancePresets';

describe('OpenID4VCI Credential Offer Parser & Detection', () => {
  it('should detect openid-credential-offer scheme', () => {
    const input = 'openid-credential-offer://?credential_offer=%7B%22credential_issuer%22%3A%22https%3A%2F%2Fissuer.example.com%22%7D';
    expect(isCredentialOfferInput(input)).toBe(true);
  });

  it('should extract clean base issuer and notification endpoint from real EUDI Playground offer URI', () => {
    const rawUri = 'openid-credential-offer://?credential_offer_uri=https%3A%2F%2Feudiplo.eudi-wallet.org%2Fissuers%2Fplayground%2Fvci%2Fcredential-offers%2F24423398-a540-4ce8-823f-242d27cfd098';
    const offer = parseCredentialOffer(rawUri);

    expect(offer.credential_issuer).toBe('https://eudiplo.eudi-wallet.org/issuers/playground/vci');
    expect(offer.notification_endpoint).toBe('https://eudiplo.eudi-wallet.org/issuers/playground/vci/notification');
  });

  it('should detect credential_offer query string parameters', () => {
    const input = 'https://wallet.example.com/offer?credential_offer_uri=https://issuer.example.com/offer/123';
    expect(isCredentialOfferInput(input)).toBe(true);
  });

  it('should detect issuance preset IDs', () => {
    expect(isCredentialOfferInput('mdl-driving-license')).toBe(true);
    expect(isCredentialOfferInput('eu-health-card')).toBe(true);
    expect(isCredentialOfferInput('random-non-existent')).toBe(false);
  });

  it('should detect OpenID4VCI offer JSON strings', () => {
    const jsonInput = JSON.stringify({
      credential_issuer: 'https://kba.de',
      credential_configuration_ids: ['org.iso.18013.5.1.mDL'],
    });
    expect(isCredentialOfferInput(jsonInput)).toBe(true);
  });

  it('should parse preset offer correctly', () => {
    const offer = parseCredentialOffer('mdl-driving-license');
    expect(offer.credential_issuer).toBe('Kraftfahrt-Bundesamt (KBA)');
    expect(offer.credential_configuration_ids).toContain('org.iso.18013.5.1.mDL');
    expect(offer.grants?.['urn:ietf:params:oauth:grant-type:pre-authorized_code']?.user_pin_required).toBe(true);
  });

  it('should simulate credential issuance successfully', async () => {
    const offer = parseCredentialOffer('eu-health-card');
    const result = await simulateIssueCredential(offer);

    expect(result.identity).toBeDefined();
    expect(result.identity.label).toBe(ISSUANCE_PRESETS[1].label);
    expect(result.identity.claims.health_insurance_number).toBe('A123456789');
    expect(result.format).toBe('vc+sd-jwt');
    expect(result.credentialId).toContain('urn:uuid:');
    expect(result.notification).toBeDefined();
    expect(result.notification?.event).toBe('credential_accepted');
  });

  it('should generate valid ES256 Holder Proof JWT', async () => {
    const proofJwt = await generateProofJwt('https://eudiplo.eudi-wallet.org/issuers/playground/vci');
    expect(proofJwt).toBeDefined();
    const parts = proofJwt.split('.');
    expect(parts.length).toBe(3);

    const header = JSON.parse(atob(parts[0].replace(/-/g, '+').replace(/_/g, '/')));
    expect(header.alg).toBe('ES256');
    expect(header.typ).toBe('openid4vci-proof+jwt');
    expect(header.jwk).toBeDefined();

    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    expect(payload.aud).toBe('https://eudiplo.eudi-wallet.org/issuers/playground/vci');
    expect(payload.iss).toBe('eudi-dev-wallet');
  });

  it('should handle token endpoint fetch attempt gracefully for non-HTTP or offline issuers', async () => {
    const offer = parseCredentialOffer('eu-health-card'); // preset issuer is text
    const tokenData = await fetchOpenID4VCIAccessToken(offer);
    expect(tokenData).toBeUndefined();
  });

  it('should return undefined when metadata discovery endpoints do not exist', async () => {
    const endpoint = await discoverTokenEndpoint('http://localhost:12345/not-exists');
    expect(endpoint).toBeUndefined();
  });

  it('should send credential notification payload with custom access token', async () => {
    const notifResult = await sendCredentialNotification(
      'https://issuer.example.com/notification',
      {
        notification_id: 'test-notif-123',
        event: 'credential_accepted',
      },
      undefined,
      'custom_live_access_token_12345'
    );

    expect(notifResult.ok).toBe(true);
    expect(notifResult.payload.event).toBe('credential_accepted');
  });
});
