import type { ActivityLogEntry, LogCategory, LogLevel } from '../types/openid4vp';

let idCounter = 0;

export function createLogEntry(
  level: LogLevel,
  category: LogCategory,
  message: string,
  details?: unknown,
): ActivityLogEntry {
  return {
    id: `log-${++idCounter}-${Date.now()}`,
    timestamp: new Date(),
    level,
    category,
    message,
    details,
  };
}

export function formatLogTime(date: Date): string {
  return date.toLocaleTimeString('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function formatLogDetails(details: unknown): string {
  if (details === undefined) return '';
  if (typeof details === 'string') return details;
  try {
    return JSON.stringify(details, null, 2);
  } catch {
    return String(details);
  }
}

export const CLAIM_LABELS: Record<string, string> = {
  given_name: 'Vorname',
  givenname: 'Vorname',
  firstname: 'Vorname',
  family_name: 'Nachname',
  familyname: 'Nachname',
  lastname: 'Nachname',
  surname: 'Nachname',
  family_name_birth: 'Geburtsname',
  familynamebirth: 'Geburtsname',
  birth_date: 'Geburtsdatum',
  birthdate: 'Geburtsdatum',
  dateofbirth: 'Geburtsdatum',
  birth_place: 'Geburtsort',
  birthplace: 'Geburtsort',
  placeofbirth: 'Geburtsort',
  email: 'E-Mail',
  address: 'Adresse',
  street: 'Straße & Hausnr.',
  locality: 'Ort',
  city: 'Ort',
  postal_code: 'Postleitzahl',
  postalcode: 'Postleitzahl',
  zip: 'Postleitzahl',
  resident_street: 'Straße (Wohnsitz)',
  residentstreet: 'Straße (Wohnsitz)',
  resident_house_number: 'Hausnummer (Wohnsitz)',
  residenthousenumber: 'Hausnummer (Wohnsitz)',
  resident_postal_code: 'PLZ (Wohnsitz)',
  residentpostalcode: 'PLZ (Wohnsitz)',
  resident_city: 'Ort (Wohnsitz)',
  residentcity: 'Ort (Wohnsitz)',
  resident_country: 'Land (Wohnsitz)',
  residentcountry: 'Land (Wohnsitz)',
  resident_state: 'Bundesland (Wohnsitz)',
  residentstate: 'Bundesland (Wohnsitz)',
  phone_number: 'Telefonnummer',
  phone: 'Telefonnummer',
  national_id: 'Personalausweis-Nr.',
  nationalid: 'Personalausweis-Nr.',
  national_id_number: 'Ausweisnummer',
  nationalidnumber: 'Ausweisnummer',
  document_number: 'Dokumentennummer',
  documentnumber: 'Dokumentennummer',
  personal_number: 'Zugangsnummer (CAN)',
  personalnumber: 'Zugangsnummer (CAN)',
  nationalities: 'Staatsangehörigkeit',
  nationality: 'Staatsangehörigkeit',
  gender: 'Geschlecht',
  sex: 'Geschlecht',
  issuing_country: 'Ausstellungsland',
  issuingcountry: 'Ausstellungsland',
  issuing_authority: 'Ausstellende Behörde',
  issuingauthority: 'Ausstellende Behörde',
  issue_date: 'Ausstellungsdatum',
  issuedate: 'Ausstellungsdatum',
  valid_from: 'Gültig ab',
  validfrom: 'Gültig ab',
  expiry_date: 'Ablaufdatum',
  expirydate: 'Ablaufdatum',
  valid_until: 'Gültig bis',
  validuntil: 'Gültig bis',
  license_number: 'Führerscheinnummer',
  licensenumber: 'Führerscheinnummer',
  driving_license_number: 'Führerscheinnummer',
  drivinglicensenumber: 'Führerscheinnummer',
  driving_privileges: 'Führerscheinklassen',
  drivingprivileges: 'Führerscheinklassen',
  categories: 'Klassen',
  age_over_18: 'Mindestalter 18',
  age_over_21: 'Mindestalter 21',
  age: 'Alter',
  age_in_years: 'Alter in Jahren',
  portrait: 'Lichtbild',
  photo: 'Foto',
};

/** Mock-Identität: alternative Keys auf gespeicherte Claim-Namen abbilden */
const CLAIM_MOCK_ALIASES: Record<string, string> = {
  birthdate: 'birth_date',
  dateofbirth: 'birth_date',
  givenname: 'given_name',
  firstname: 'given_name',
  familyname: 'family_name',
  lastname: 'family_name',
  surname: 'family_name',
  familynamebirth: 'family_name_birth',
  birthplace: 'birth_place',
  placeofbirth: 'birth_place',
  residentaddress: 'address',
  street: 'address',
  nationalid: 'national_id',
  nationalidnumber: 'national_id',
  personalnumber: 'national_id',
  documentnumber: 'national_id',
  licensenumber: 'license_number',
  drivinglicensenumber: 'license_number',
  sex: 'gender',
  categories: 'driving_privileges',
  vehiclecategories: 'driving_privileges',
  nationality: 'nationalities',
};

export function claimLabel(key: string): string {
  if (CLAIM_LABELS[key]) return CLAIM_LABELS[key];
  const norm = key.toLowerCase().replace(/[-_]/g, '');
  if (CLAIM_LABELS[norm]) return CLAIM_LABELS[norm];
  return key;
}

export function mockClaimValue(identityClaims: Record<string, string>, key: string): string {
  // 1. Direct match
  if (identityClaims[key] !== undefined) return identityClaims[key];

  // 2. Alias match
  const alias = CLAIM_MOCK_ALIASES[key];
  if (alias && identityClaims[alias] !== undefined) return identityClaims[alias];

  // Lowercase normalized lookup
  const normKey = key.toLowerCase().replace(/[-_]/g, '');
  for (const [k, val] of Object.entries(identityClaims)) {
    if (k.toLowerCase().replace(/[-_]/g, '') === normKey) {
      return val;
    }
  }

  // 3. Infer persona from existing claims
  const isMax = identityClaims.given_name === 'Max' || identityClaims.family_name === 'Mustermann';

  // 4. Dynamic mock fallbacks based on normalized key
  if (normKey === 'givenname' || normKey === 'firstname') {
    return isMax ? 'Max' : 'Anna';
  }
  if (normKey === 'familyname' || normKey === 'lastname' || normKey === 'surname') {
    return isMax ? 'Mustermann' : 'Beispiel';
  }
  if (normKey === 'familynameatbirth' || normKey === 'familynamebirth') {
    return isMax ? 'Mustermann' : 'Beispiel';
  }
  if (normKey === 'birthdate' || normKey === 'dateofbirth') {
    return isMax ? '1990-01-15' : '1985-06-22';
  }
  if (normKey === 'birthplace' || normKey === 'placeofbirth') {
    return isMax ? 'Berlin' : 'München';
  }
  if (normKey === 'address' || normKey === 'residentaddress') {
    return isMax ? 'Musterstraße 1, 10115 Berlin' : 'Beispielweg 12, 80331 München';
  }
  if (normKey === 'residentstreet' || normKey === 'streetname' || normKey === 'street') {
    return isMax ? 'Musterstraße' : 'Beispielweg';
  }
  if (normKey === 'residenthousenumber' || normKey === 'housenumber') {
    return isMax ? '1' : '12';
  }
  if (normKey === 'locality' || normKey === 'city' || normKey === 'town' || normKey === 'residentcity') {
    return isMax ? 'Berlin' : 'München';
  }
  if (normKey === 'postalcode' || normKey === 'postcode' || normKey === 'zip' || normKey === 'residentpostalcode') {
    return isMax ? '10115' : '80331';
  }
  if (normKey === 'email') {
    return isMax ? 'max.mustermann@example.com' : 'anna.beispiel@example.com';
  }
  if (normKey === 'phone' || normKey === 'phonenumber' || normKey === 'telephone') {
    return isMax ? '+491701234567' : '+491717654321';
  }
  if (normKey === 'nationalities' || normKey === 'nationality' || normKey === 'country') {
    return 'DE';
  }
  if (normKey === 'issuingcountry' || normKey === 'issuingstate') {
    return 'DE';
  }
  if (normKey === 'issuingauthority') {
    return isMax ? 'Stadt Berlin' : 'Stadt München';
  }
  if (normKey === 'nationalid' || normKey === 'nationalidnumber' || normKey === 'personalnumber' || normKey === 'documentnumber' || normKey === 'adminnumber' || normKey === 'administrativenumber') {
    return isMax ? 'T220001293' : 'L012345678';
  }
  if (normKey === 'licensenumber' || normKey === 'drivinglicensenumber') {
    return isMax ? 'D123456789' : 'D987654321';
  }
  if (normKey === 'gender' || normKey === 'sex') {
    return isMax ? 'male' : 'female';
  }
  if (normKey === 'drivingprivileges' || normKey === 'categories' || normKey === 'vehiclecategories') {
    return isMax ? 'AM, A1, A2, A, B, BE' : 'AM, B';
  }
  if (normKey === 'academicdegree' || normKey === 'academicdegreetitle' || normKey === 'degree') {
    return isMax ? 'M. Sc.' : 'Dr. rer. nat.';
  }
  if (normKey === 'title') {
    return isMax ? '' : 'Dr.';
  }
  if (normKey === 'pseudonym') {
    return isMax ? 'mustermann-pseudonym-42' : 'beispiel-pseudonym-87';
  }
  if (normKey === 'eyecolor' || normKey === 'eyescolor') {
    return isMax ? 'blue' : 'brown';
  }
  if (normKey === 'haircolor') {
    return isMax ? 'brown' : 'blonde';
  }
  if (normKey === 'height') {
    return isMax ? '180 cm' : '168 cm';
  }
  if (normKey === 'weight') {
    return isMax ? '80 kg' : '62 kg';
  }
  if (normKey === 'distinguishingmarks' || normKey === 'distinguishing_marks') {
    return 'none';
  }
  if (normKey === 'documenttype' || normKey === 'doctype') {
    return 'Personalausweis';
  }
  if (normKey === 'countryname' || normKey === 'issuingcountryname') {
    return 'Deutschland';
  }

  // 5. Check age conditions
  if (normKey.includes('ageover18') || normKey.includes('ageequalorover18')) {
    return 'true';
  }
  if (normKey.includes('ageover21') || normKey.includes('ageequalorover21')) {
    return 'true';
  }
  if (normKey.includes('ageover') || normKey.includes('ageequalorover')) {
    return 'true';
  }
  if (normKey === 'age' || normKey === 'ageinyears') {
    return isMax ? '36' : '41';
  }

  // 6. Dates check
  if (normKey.includes('expiry') || normKey.includes('validuntil')) {
    return '2036-07-18';
  }
  if (normKey.includes('issue') || normKey.includes('validfrom')) {
    return '2026-07-18';
  }
  if (normKey.includes('date')) {
    return '2026-07-18';
  }

  // 7. General fallback heuristics
  if (normKey.includes('image') || normKey.includes('portrait') || normKey.includes('photo') || normKey.includes('face') || normKey.includes('signature')) {
    return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  }
  if (normKey.includes('mail')) {
    return isMax ? 'max.mustermann@example.com' : 'anna.beispiel@example.com';
  }
  if (normKey.includes('number') || normKey.includes('id') || normKey.includes('code')) {
    return isMax ? 'T220001293' : 'L012345678';
  }
  if (normKey.includes('status') || normKey.includes('active') || normKey.includes('valid') || normKey.includes('donor')) {
    return 'true';
  }

  // 8. Final generic fallback
  return isMax ? 'Max Mustermann' : 'Anna Beispiel';
}
