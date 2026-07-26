import type { MockIdentity, CredentialDisplayMetadata } from './openid4vp';

export type IssuanceStep = 'OFFER_INPUT' | 'PIN_AUTH' | 'CREDENTIAL_PREVIEW' | 'SUCCESS';

export interface CredentialOfferGrants {
  'urn:ietf:params:oauth:grant-type:pre-authorized_code'?: {
    'pre-authorized_code': string;
    user_pin_required?: boolean;
    tx_code?: {
      input_mode?: 'numeric' | 'text';
      length?: number;
      description?: string;
    };
  };
  authorization_code?: {
    issuer_state?: string;
  };
}

export interface CredentialOffer {
  credential_issuer: string;
  credential_configuration_ids: string[];
  grants?: CredentialOfferGrants;
  display_name?: string;
  preset_id?: string;
  notification_endpoint?: string;
  display?: CredentialDisplayMetadata;
}

export interface IssuancePreset {
  id: string;
  label: string;
  description: string;
  category: string;
  icon: string;
  issuerName: string;
  credentialType: string;
  format: 'mso_mdoc' | 'vc+sd-jwt';
  requiresPin: boolean;
  defaultPin?: string;
  claims: Record<string, string>;
}

export interface IssuedCredentialResult {
  identity: MockIdentity;
  format: 'mso_mdoc' | 'vc+sd-jwt';
  issuedAt: string;
  expiresAt: string;
  credentialId: string;
  issuer: string;
  accessToken?: string;
  notification?: {
    notification_id: string;
    event: 'credential_accepted' | 'credential_failure' | 'credential_deleted';
    event_description?: string;
  };
}
