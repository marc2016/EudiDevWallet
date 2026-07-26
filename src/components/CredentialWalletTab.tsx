import { useState } from 'react';
import { Icon } from '@mdi/react';
import {
  mdiCardAccountDetailsOutline,
  mdiFileDocumentOutline,
  mdiTrayArrowDown,
  mdiDelete,
  mdiDownload,
  mdiShieldCheckOutline,
  mdiInboxOutline,
  mdiClose,
} from '@mdi/js';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import type { MockIdentity } from '../types/openid4vp';

interface CredentialWalletTabProps {
  identities: MockIdentity[];
  onRemove: (id: string) => void;
  onClearAll: () => void;
}

// Key claims to surface on the card face (in priority order)
const PREVIEW_KEYS: [string, string][] = [
  ['given_name', 'Vorname'],
  ['family_name', 'Nachname'],
  ['birth_date', 'Geburtsdatum'],
  ['national_id', 'Ausweis-Nr.'],
  ['employee_id', 'Mitarbeiter-Nr.'],
  ['company_name', 'Unternehmen'],
  ['job_title', 'Position'],
  ['degree_name', 'Abschluss'],
  ['university_name', 'Hochschule'],
  ['organization_name', 'Organisation'],
  ['organization_identifier', 'Register-Nr.'],
  ['age_over_18', 'Volljährig (18+)'],
  ['issuing_authority', 'Aussteller'],
  ['document_type', 'Dokumententyp'],
];

// Human-readable label map for ALL claims shown in the detail modal
const CLAIM_LABELS: Record<string, string> = {
  given_name: 'Vorname',
  family_name: 'Nachname',
  birth_date: 'Geburtsdatum',
  birth_place: 'Geburtsort',
  address: 'Adresse',
  nationalities: 'Nationalität',
  email: 'E-Mail',
  phone_number: 'Telefon',
  gender: 'Geschlecht',
  national_id: 'Ausweis-Nr.',
  issuing_country: 'Ausstellungsland',
  issuing_authority: 'Aussteller',
  license_number: 'Führerschein-Nr.',
  driving_privileges: 'Fahrklassen',
  employee_id: 'Mitarbeiter-Nr.',
  company_name: 'Unternehmen',
  job_title: 'Position',
  department: 'Abteilung',
  employment_status: 'Beschäftigungsstatus',
  issue_date: 'Ausstellungsdatum',
  degree_name: 'Abschluss',
  field_of_study: 'Studienfach',
  university_name: 'Hochschule',
  graduation_year: 'Abschlussjahr',
  grade: 'Note',
  eqf_level: 'EQF-Niveau',
  organization_name: 'Organisation',
  organization_identifier: 'Register-Nr.',
  registration_authority: 'Registrierungsbehörde',
  representative_name: 'Vertretungsberechtigte/r',
  representation_role: 'Rolle',
  vat_id: 'USt-IdNr.',
  registered_office: 'Sitz',
  age_over_18: 'Volljährig (18+)',
  age_over_21: 'Über 21',
  ageequalorover18: '≥ 18 Jahre',
  ageequalorover21: '≥ 21 Jahre',
  document_type: 'Dokumententyp',
};

function getCardGradient(identity: MockIdentity): string {
  if (identity.display?.backgroundColor) {
    const bg = identity.display.backgroundColor;
    if (bg.includes('gradient') || bg.includes('url')) return bg;
    return `linear-gradient(135deg, ${bg} 0%, ${bg} 100%)`;
  }
  if (identity.category === 'PID') {
    return 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 60%, #3b82f6 100%)';
  }
  if (identity.category === 'EAA Presets') {
    return 'linear-gradient(135deg, #064e3b 0%, #059669 60%, #34d399 100%)';
  }
  return 'linear-gradient(135deg, #3b0764 0%, #7c3aed 60%, #a78bfa 100%)';
}

function getChipLabel(identity: MockIdentity): string {
  if (identity.category === 'PID') return 'PID';
  if (identity.category === 'EAA Presets') return 'EAA';
  return 'VCI';
}

function getCardIconPath(identity: MockIdentity): string {
  if (identity.category === 'PID') return mdiCardAccountDetailsOutline;
  if (identity.category === 'EAA Presets') return mdiFileDocumentOutline;
  return mdiTrayArrowDown;
}

function isCustom(identity: MockIdentity): boolean {
  return identity.category !== 'PID' && identity.category !== 'EAA Presets';
}

function getPreviewClaims(identity: MockIdentity): { label: string; value: string }[] {
  const results: { label: string; value: string }[] = [];
  for (const [key, label] of PREVIEW_KEYS) {
    const val = identity.claims[key];
    if (val && results.length < 3) {
      results.push({ label, value: String(val) });
    }
  }
  return results;
}

// ─────────────────────────────────────────────
// Detail Modal
// ─────────────────────────────────────────────

interface CredentialDetailModalProps {
  identity: MockIdentity | null;
  onClose: () => void;
  onRemove: (id: string) => void;
}

function CredentialDetailModal({ identity, onClose, onRemove }: CredentialDetailModalProps) {
  if (!identity) return null;

  const custom = isCustom(identity);
  const allClaims = Object.entries(identity.claims);

  const handleDelete = () => {
    confirmDialog({
      message: `Credential „${identity.label}" wirklich löschen?`,
      header: 'Credential löschen',
      icon: 'pi pi-trash',
      acceptClassName: 'p-button-danger',
      acceptLabel: 'Löschen',
      rejectLabel: 'Abbrechen',
      accept: () => {
        onRemove(identity.id);
        onClose();
      },
    });
  };

  return (
    <Dialog
      visible
      onHide={onClose}
      modal
      blockScroll
      dismissableMask
      closable={false}
      showHeader={false}
      style={{ width: 'min(90vw, 36rem)', padding: 0 }}
      contentStyle={{ padding: 0, borderRadius: '1rem', overflow: 'hidden' }}
      pt={{ root: { style: { borderRadius: '1rem' } } }}
    >
      {/* Card-style header */}
      <div
        className="cred-modal-header"
        style={{
          background: getCardGradient(identity),
          color: identity.display?.textColor ?? '#ffffff',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {identity.display?.backgroundImageUrl ? (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage: `url(${identity.display.backgroundImageUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              opacity: 0.45,
              pointerEvents: 'none',
            }}
            aria-hidden
          />
        ) : (
          <>
            <div className="cred-card-circle cred-card-circle--1" aria-hidden />
            <div className="cred-card-circle cred-card-circle--2" aria-hidden />
          </>
        )}

        <div className="cred-modal-header-top" style={{ position: 'relative', zIndex: 1 }}>
          <div className="cred-modal-header-left" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {identity.display?.logoUrl ? (
              <img
                src={identity.display.logoUrl}
                alt="Logo"
                style={{
                  maxHeight: '1.8rem',
                  maxWidth: '5rem',
                  objectFit: 'contain',
                  filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.4))',
                  borderRadius: '4px',
                }}
              />
            ) : (
              <Icon
                path={getCardIconPath(identity)}
                size={1.4}
                style={{ filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.35))' }}
                aria-hidden
              />
            )}
            <span className="cred-card-chip">{getChipLabel(identity)}</span>
          </div>
          <button className="cred-modal-close" onClick={onClose} aria-label="Schließen">
            <Icon path={mdiClose} size={0.9} aria-hidden />
          </button>
        </div>

        <div className="cred-modal-title" style={{ position: 'relative', zIndex: 1 }}>
          {identity.label.replace(/^[^\w]+ ?/, '')}
        </div>
        {identity.description && !identity.description.startsWith('Erfolgreich von') && (
          <div className="cred-modal-subtitle" style={{ position: 'relative', zIndex: 1, opacity: 0.9 }}>
            {identity.description}
          </div>
        )}
      </div>

      {/* Claims table */}
      <div className="cred-modal-body">
        <table className="cred-modal-table">
          <tbody>
            {allClaims.map(([key, value]) => (
              <tr key={key}>
                <td className="cred-modal-key">
                  {CLAIM_LABELS[key] ?? key}
                </td>
                <td className="cred-modal-value">{String(value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer actions */}
      {custom && (
        <div className="cred-modal-footer">
          <Button
            icon="pi pi-trash"
            label="Credential löschen"
            severity="danger"
            outlined
            size="small"
            onClick={handleDelete}
          />
        </div>
      )}
    </Dialog>
  );
}

// ─────────────────────────────────────────────
// Credential Card (tile)
// ─────────────────────────────────────────────

interface CredentialCardProps {
  identity: MockIdentity;
  onRemove: (id: string) => void;
  onClick: (identity: MockIdentity) => void;
}

function CredentialCard({ identity, onRemove, onClick }: CredentialCardProps) {
  const [hovered, setHovered] = useState(false);
  const custom = isCustom(identity);
  const preview = getPreviewClaims(identity);

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation(); // don't open the modal
    confirmDialog({
      message: `Credential „${identity.label}" wirklich löschen?`,
      header: 'Credential löschen',
      icon: 'pi pi-trash',
      acceptClassName: 'p-button-danger',
      acceptLabel: 'Löschen',
      rejectLabel: 'Abbrechen',
      accept: () => onRemove(identity.id),
    });
  };

  return (
    <div
      className={`cred-card ${hovered ? 'cred-card--hovered' : ''}`}
      style={{
        background: getCardGradient(identity),
        color: identity.display?.textColor ?? undefined,
        position: 'relative',
        overflow: 'hidden',
        cursor: 'pointer',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onClick(identity)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick(identity); }}
      aria-label={`${identity.label} — Details anzeigen`}
    >
      {/* Background Image Layer */}
      {identity.display?.backgroundImageUrl ? (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `url(${identity.display.backgroundImageUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: 0.4,
            pointerEvents: 'none',
          }}
          aria-hidden
        />
      ) : (
        <>
          <div className="cred-card-circle cred-card-circle--1" aria-hidden />
          <div className="cred-card-circle cred-card-circle--2" aria-hidden />
        </>
      )}

      {/* Header row */}
      <div className="cred-card-header" style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {identity.display?.logoUrl ? (
          <img
            src={identity.display.logoUrl}
            alt="Logo"
            style={{
              maxHeight: '1.5rem',
              maxWidth: '4.5rem',
              objectFit: 'contain',
              filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))',
              borderRadius: '3px',
            }}
          />
        ) : (
          <Icon
            path={getCardIconPath(identity)}
            size={1.1}
            className="cred-card-mdi-icon"
            aria-hidden
          />
        )}
        <span className="cred-card-chip">{getChipLabel(identity)}</span>
      </div>

      {/* Title + description */}
      <div className="cred-card-title" style={{ position: 'relative', zIndex: 1 }}>
        {identity.label.replace(/^[^\w]+ ?/, '')}
      </div>
      {identity.description && !identity.description.startsWith('Erfolgreich von') && (
        <div className="cred-card-desc" style={{ position: 'relative', zIndex: 1, opacity: 0.9 }}>
          {identity.description}
        </div>
      )}

      {/* Claim preview */}
      <div className="cred-card-claims" style={{ position: 'relative', zIndex: 1 }}>
        {preview.map(({ label, value }) => (
          <div key={label} className="cred-card-claim">
            <span className="cred-card-claim-label">{label}</span>
            <span className="cred-card-claim-value">{value}</span>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="cred-card-footer" style={{ position: 'relative', zIndex: 1 }}>
        <span className="cred-card-issuer">
          {identity.claims['issuing_authority'] ?? identity.claims['issuing_country'] ?? ''}
        </span>
        {custom && (
          <button
            className="cred-card-delete"
            onClick={handleDelete}
            title="Credential löschen"
            aria-label={`${identity.label} löschen`}
          >
            <Icon path={mdiDelete} size={0.75} aria-hidden />
          </button>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Wallet Tab (root)
// ─────────────────────────────────────────────

export function CredentialWalletTab({ identities, onRemove, onClearAll }: CredentialWalletTabProps) {
  const [selectedIdentity, setSelectedIdentity] = useState<MockIdentity | null>(null);
  const custom = identities.filter(isCustom);
  const presets = identities.filter((i) => !isCustom(i));

  const handleClearAll = () => {
    confirmDialog({
      message: `Alle ${custom.length} ausgestellten Credentials wirklich löschen?`,
      header: 'Alle löschen',
      icon: 'pi pi-exclamation-triangle',
      acceptClassName: 'p-button-danger',
      acceptLabel: 'Alle löschen',
      rejectLabel: 'Abbrechen',
      accept: onClearAll,
    });
  };

  return (
    <div className="cred-wallet">
      <ConfirmDialog />

      <CredentialDetailModal
        identity={selectedIdentity}
        onClose={() => setSelectedIdentity(null)}
        onRemove={onRemove}
      />

      {/* VCI Issued Credentials */}
      <div className="cred-wallet-section">
        <div className="cred-wallet-section-header">
          <h2 className="cred-wallet-section-title">
            <Icon path={mdiDownload} size={0.85} aria-hidden />
            Ausgestellte Credentials
          </h2>
          {custom.length > 0 && (
            <Button
              icon="pi pi-trash"
              label="Alle löschen"
              size="small"
              severity="danger"
              outlined
              onClick={handleClearAll}
              className="cred-wallet-clear-btn"
            />
          )}
        </div>

        {custom.length === 0 ? (
          <div className="cred-wallet-empty">
            <Icon path={mdiInboxOutline} size={2} style={{ opacity: 0.35 }} aria-hidden />
            <p>Noch keine Credentials via OpenID4VCI ausgestellt.</p>
            <p className="cred-wallet-empty-hint">
              Scanne einen Credential-Offer-Link im Tab <strong>Anfrage</strong>, um Credentials zu empfangen.
            </p>
          </div>
        ) : (
          <div className="cred-card-grid">
            {custom.map((id) => (
              <CredentialCard
                key={id.id}
                identity={id}
                onRemove={onRemove}
                onClick={setSelectedIdentity}
              />
            ))}
          </div>
        )}
      </div>

      {/* Built-in Presets */}
      <div className="cred-wallet-section">
        <div className="cred-wallet-section-header">
          <h2 className="cred-wallet-section-title">
            <Icon path={mdiShieldCheckOutline} size={0.85} aria-hidden />
            Eingebaute Presets
          </h2>
          <span className="cred-wallet-badge">{presets.length}</span>
        </div>
        <div className="cred-card-grid">
          {presets.map((id) => (
            <CredentialCard
              key={id.id}
              identity={id}
              onRemove={onRemove}
              onClick={setSelectedIdentity}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
