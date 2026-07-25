import { describe, expect, it } from 'vitest';
import { mockIdentities } from '../../data/mockIdentities';
import { claimLabel, mockClaimValue } from '../../log/activityLog';
import { buildMockSdJwtVpToken } from '../buildMockSdJwt';
import { buildMockMdocVpToken } from '../buildMockMdoc';

describe('EAA Credential Presets (mockIdentities)', () => {
  it('should contain all required EAA preset identities alongside PID identities', () => {
    const ids = mockIdentities.map((m) => m.id);
    expect(ids).toContain('max-mustermann');
    expect(ids).toContain('anna-beispiel');
    expect(ids).toContain('eaa-age-verification');
    expect(ids).toContain('eaa-employee-id');
    expect(ids).toContain('eaa-educational-credential');
    expect(ids).toContain('eaa-org-id');
  });

  describe('Altersnachweis (Over 18 / Over 21) Preset', () => {
    const preset = mockIdentities.find((m) => m.id === 'eaa-age-verification')!;

    it('should have correct category and claims for selective disclosure age verification', () => {
      expect(preset.category).toBe('EAA Presets');
      expect(preset.claims.age_over_18).toBe('true');
      expect(preset.claims.age_over_21).toBe('true');
      expect(preset.claims.given_name).toBeUndefined();
      expect(preset.claims.family_name).toBeUndefined();
      expect(preset.claims.birth_date).toBeUndefined();
    });

    it('should resolve mock claim values correctly for age checks', () => {
      expect(mockClaimValue(preset.claims, 'age_over_18')).toBe('true');
      expect(mockClaimValue(preset.claims, 'age_over_21')).toBe('true');
      expect(mockClaimValue(preset.claims, 'ageequalorover18')).toBe('true');
    });
  });

  describe('Digitaler Mitarbeiterausweis (Employee ID) Preset', () => {
    const preset = mockIdentities.find((m) => m.id === 'eaa-employee-id')!;

    it('should contain company name, job title, and employee ID', () => {
      expect(preset.category).toBe('EAA Presets');
      expect(preset.claims.employee_id).toBe('EMP-88492');
      expect(preset.claims.company_name).toBe('Acme Tech GmbH');
      expect(preset.claims.job_title).toBe('Senior Software Engineer');
      expect(preset.claims.department).toBe('Digital Identity Lab');
    });

    it('should map alias claim keys properly', () => {
      expect(mockClaimValue(preset.claims, 'employeeid')).toBe('EMP-88492');
      expect(mockClaimValue(preset.claims, 'companyname')).toBe('Acme Tech GmbH');
      expect(mockClaimValue(preset.claims, 'jobtitle')).toBe('Senior Software Engineer');
    });
  });

  describe('Bildungsnachweis (Educational Credential) Preset', () => {
    const preset = mockIdentities.find((m) => m.id === 'eaa-educational-credential')!;

    it('should contain degree, field of study, university name, and EQF level', () => {
      expect(preset.category).toBe('EAA Presets');
      expect(preset.claims.degree_name).toBe('Master of Science (M. Sc.)');
      expect(preset.claims.field_of_study).toBe('Informatik');
      expect(preset.claims.university_name).toBe('Technische Universität München');
      expect(preset.claims.grade).toBe('1.3');
      expect(preset.claims.eqf_level).toBe('7');
    });

    it('should resolve aliases and fallbacks for academic credentials', () => {
      expect(mockClaimValue(preset.claims, 'degreename')).toBe('Master of Science (M. Sc.)');
      expect(mockClaimValue(preset.claims, 'universityname')).toBe('Technische Universität München');
      expect(mockClaimValue(preset.claims, 'fieldofstudy')).toBe('Informatik');
    });
  });

  describe('Handelsregisterauszug / Org-ID Preset', () => {
    const preset = mockIdentities.find((m) => m.id === 'eaa-org-id')!;

    it('should contain org name, org identifier, registration authority, and representative', () => {
      expect(preset.category).toBe('EAA Presets');
      expect(preset.claims.organization_name).toBe('Acme Tech GmbH');
      expect(preset.claims.organization_identifier).toBe('HRB 123456');
      expect(preset.claims.registration_authority).toBe('Amtsgericht München');
      expect(preset.claims.representative_name).toBe('Max Mustermann');
      expect(preset.claims.representation_role).toBe('Geschäftsführer');
    });

    it('should resolve aliases for org claims', () => {
      expect(mockClaimValue(preset.claims, 'organizationname')).toBe('Acme Tech GmbH');
      expect(mockClaimValue(preset.claims, 'orgid')).toBe('HRB 123456');
      expect(mockClaimValue(preset.claims, 'vatid')).toBe('DE123456789');
    });
  });

  describe('German Claim Label Mappings', () => {
    it('should map EAA keys to clear German labels', () => {
      expect(claimLabel('age_over_18')).toContain('Mindestalter 18');
      expect(claimLabel('employee_id')).toBe('Mitarbeiter-ID');
      expect(claimLabel('company_name')).toBe('Firmenname');
      expect(claimLabel('job_title')).toBe('Position / Stellenbezeichnung');
      expect(claimLabel('degree_name')).toBe('Abschlussbezeichnung');
      expect(claimLabel('university_name')).toBe('Hochschule / Universität');
      expect(claimLabel('organization_name')).toBe('Organisation / Firma');
      expect(claimLabel('organization_identifier')).toBe('Handelsregisternummer / Org-ID');
    });
  });

  describe('Credential Token Generation with Presets', () => {
    it('should build valid SD-JWT VP token using Employee ID EAA claims', async () => {
      const preset = mockIdentities.find((m) => m.id === 'eaa-employee-id')!;
      const token = await buildMockSdJwtVpToken({
        claims: preset.claims,
        nonce: 'nonce123',
        vct: 'urn:eudi:eaa:employee:1',
      });
      expect(token).toContain('~');
      const parts = token.split('~');
      expect(parts.length).toBe(2);
    });

    it('should build valid mdoc VP token using Org-ID EAA claims', async () => {
      const preset = mockIdentities.find((m) => m.id === 'eaa-org-id')!;
      const token = await buildMockMdocVpToken({
        claims: preset.claims,
        docType: 'org.eudi.eaa.1',
      });
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(50);
    });
  });
});
