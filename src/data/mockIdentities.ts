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
      email: 'max.mustermann@example.com',
      phone_number: '+49 170 1234567',
      birth_place: 'Berlin',
      gender: 'male',
      national_id: 'T220001293',
      issuing_country: 'DE',
      issuing_authority: 'Stadt Berlin',
      license_number: 'D123456789',
      driving_privileges: 'AM, A1, A2, A, B, BE',
    },
  },
  {
    id: 'anna-beispiel',
    label: 'Anna Beispiel',
    claims: {
      given_name: 'Anna',
      family_name: 'Beispiel',
      birth_date: '1985-06-22',
      address: 'Beispielweg 12, 80331 München',
      nationalities: 'DE',
      email: 'anna.beispiel@example.com',
      phone_number: '+49 171 7654321',
      birth_place: 'München',
      gender: 'female',
      national_id: 'L012345678',
      issuing_country: 'DE',
      issuing_authority: 'Stadt München',
      license_number: 'D987654321',
      driving_privileges: 'AM, B',
    },
  },
];

export const defaultIdentity = mockIdentities[0];
