import type { MockIdentity } from '../types/openid4vp';

export const mockIdentities: MockIdentity[] = [
  {
    id: 'max-mustermann',
    label: 'Max Mustermann (PID)',
    category: 'PID',
    description: 'Vollständiger Personalausweis & Führerschein',
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
    label: 'Anna Beispiel (PID)',
    category: 'PID',
    description: 'Alternative Personalausweis-Identität',
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
  {
    id: 'eaa-age-verification',
    label: '🔞 Altersnachweis (Over 18 / Over 21)',
    category: 'EAA Presets',
    description: 'Selective Disclosure — Volljährigkeit ohne Namens-/Geburtsdatumsangabe',
    claims: {
      age_over_18: 'true',
      age_over_21: 'true',
      ageequalorover18: 'true',
      ageequalorover21: 'true',
      issuing_country: 'DE',
      issuing_authority: 'EUDI Mock Trust Service',
      document_type: 'Age Verification EAA',
    },
  },
  {
    id: 'eaa-employee-id',
    label: '💼 Digitaler Mitarbeiterausweis (Employee ID)',
    category: 'EAA Presets',
    description: 'Firmenausweis mit Position, Firmenname und Mitarbeiter-ID',
    claims: {
      given_name: 'Max',
      family_name: 'Mustermann',
      employee_id: 'EMP-88492',
      company_name: 'Acme Tech GmbH',
      job_title: 'Senior Software Engineer',
      department: 'Digital Identity Lab',
      email: 'max.mustermann@acme.de',
      employment_status: 'active',
      issue_date: '2024-01-15',
      issuing_authority: 'Acme Corporate Identity Service',
    },
  },
  {
    id: 'eaa-educational-credential',
    label: '🎓 Bildungsnachweis (Educational Credential)',
    category: 'EAA Presets',
    description: 'Hochschulabschluss und Qualifikationsnachweis (Master of Science)',
    claims: {
      given_name: 'Max',
      family_name: 'Mustermann',
      degree_name: 'Master of Science (M. Sc.)',
      field_of_study: 'Informatik',
      university_name: 'Technische Universität München',
      graduation_year: '2018',
      grade: '1.3',
      eqf_level: '7',
      issuing_authority: 'TU München Prüfungsamt',
    },
  },
  {
    id: 'eaa-org-id',
    label: '🏢 Handelsregisterauszug / Org-ID',
    category: 'EAA Presets',
    description: 'Vertretungsberechtigung einer Organisation/Firma',
    claims: {
      organization_name: 'Acme Tech GmbH',
      organization_identifier: 'HRB 123456',
      registration_authority: 'Amtsgericht München',
      representative_name: 'Max Mustermann',
      representation_role: 'Geschäftsführer',
      vat_id: 'DE123456789',
      registered_office: 'München',
      issuing_authority: 'Handelsregister Bayern',
    },
  },
];

export const defaultIdentity = mockIdentities[0];

const STORAGE_KEY = 'eudi_wallet_issued_credentials';

export function loadStoredIdentities(): MockIdentity[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveStoredIdentities(identities: MockIdentity[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(identities));
  } catch (err) {
    console.error('Failed to save issued credentials to localStorage:', err);
  }
}

export function addCustomIdentity(identity: MockIdentity): MockIdentity[] {
  const current = loadStoredIdentities();
  const updated = [identity, ...current];
  saveStoredIdentities(updated);
  return getAllIdentities();
}

export function getAllIdentities(): MockIdentity[] {
  const custom = loadStoredIdentities();
  return [...custom, ...mockIdentities];
}

export function removeCustomIdentity(id: string): MockIdentity[] {
  const current = loadStoredIdentities();
  const updated = current.filter((i) => i.id !== id);
  saveStoredIdentities(updated);
  return getAllIdentities();
}

export function clearCustomIdentities(): MockIdentity[] {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
  return [...mockIdentities];
}

