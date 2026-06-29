import type { MockIdentity } from '../types/openid4vp';

export const mockIdentities: MockIdentity[] = [
  {
    id: 'max-mustermann',
    label: 'Max Mustermann',
    claims: {
      given_name: 'Max',
      family_name: 'Mustermann',
      birth_date: '1990-01-15',
      address: 'Musterstraße 1, 10115 Berlin',
      nationalities: 'DE',
      'eu.europa.ec.eudi.pid.1': 'Personalausweis',
    },
  },
  {
    id: 'anna-beispiel',
    label: 'Anna Beispiel',
    claims: {
      given_name: 'Anna',
      family_name: 'Beispiel',
      birth_date: '1985-06-22',
      email: 'anna@example.com',
      address: 'Beispielweg 12, 80331 München',
      nationalities: 'DE',
      'eu.europa.ec.eudi.pid.1': 'Personalausweis',
    },
  },
];

export const defaultIdentity = mockIdentities[0];
