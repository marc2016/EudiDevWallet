import type { MockIdentity } from '../types/openid4vp';

export const mockIdentities: MockIdentity[] = [
  {
    id: 'max-mustermann',
    label: 'Max Mustermann',
    claims: {
      given_name: 'Max',
      family_name: 'Mustermann',
      birth_date: '1990-01-15',
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
    },
  },
];

export const defaultIdentity = mockIdentities[0];
