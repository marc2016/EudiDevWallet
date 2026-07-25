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
} from '@mdi/js';
import { Button } from 'primereact/button';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import type { MockIdentity } from '../types/openid4vp';

interface CredentialWalletTabProps {
  identities: MockIdentity[];
  onRemove: (id: string) => void;
  onClearAll: () => void;
}

// Key claims to surface on each card (in priority order)
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

function getCardGradient(identity: MockIdentity): string {
  if (identity.category === 'PID') {
    return 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 60%, #3b82f6 100%)';
  }
  if (identity.category === 'EAA Presets') {
    return 'linear-gradient(135deg, #064e3b 0%, #059669 60%, #34d399 100%)';
  }
  // Issued via VCI
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

interface CredentialCardProps {
  identity: MockIdentity;
  onRemove: (id: string) => void;
}

function CredentialCard({ identity, onRemove }: CredentialCardProps) {
  const [hovered, setHovered] = useState(false);
  const custom = isCustom(identity);
  const preview = getPreviewClaims(identity);

  const handleDelete = () => {
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
      style={{ background: getCardGradient(identity) }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Decorative circles */}
      <div className="cred-card-circle cred-card-circle--1" aria-hidden />
      <div className="cred-card-circle cred-card-circle--2" aria-hidden />

      {/* Header row */}
      <div className="cred-card-header">
        <Icon
          path={getCardIconPath(identity)}
          size={1.1}
          className="cred-card-mdi-icon"
          aria-hidden
        />
        <span className="cred-card-chip">{getChipLabel(identity)}</span>
      </div>

      {/* Title + description */}
      <div className="cred-card-title">{identity.label.replace(/^[^\w]+ ?/, '')}</div>
      {identity.description && (
        <div className="cred-card-desc">{identity.description}</div>
      )}

      {/* Claim preview */}
      <div className="cred-card-claims">
        {preview.map(({ label, value }) => (
          <div key={label} className="cred-card-claim">
            <span className="cred-card-claim-label">{label}</span>
            <span className="cred-card-claim-value">{value}</span>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="cred-card-footer">
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

export function CredentialWalletTab({ identities, onRemove, onClearAll }: CredentialWalletTabProps) {
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
              <CredentialCard key={id.id} identity={id} onRemove={onRemove} />
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
            <CredentialCard key={id.id} identity={id} onRemove={onRemove} />
          ))}
        </div>
      </div>
    </div>
  );
}
