import { Card } from 'primereact/card';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { Checkbox } from 'primereact/checkbox';
import { Tag } from 'primereact/tag';
import { Button } from 'primereact/button';
import type { ExtractedClaim, MockIdentity } from '../types/openid4vp';
import { mockIdentities as defaultMockIdentities } from '../data/mockIdentities';

interface IdentityPickerProps {
  claims: ExtractedClaim[];
  selectedIdentityId: string;
  claimValues: Record<string, string>;
  selectedClaims: Record<string, boolean>;
  identities?: MockIdentity[];
  simulateOneTimeUse?: boolean;
  remainingCredentials?: number;
  onIdentityChange: (id: string) => void;
  onClaimChange: (key: string, value: string) => void;
  onToggleClaimSelection: (key: string) => void;
  onSelectAllClaims?: () => void;
  onDeselectOptionalClaims?: () => void;
}

export function IdentityPicker({
  claims,
  selectedIdentityId,
  claimValues,
  selectedClaims,
  identities = defaultMockIdentities,
  simulateOneTimeUse,
  remainingCredentials,
  onIdentityChange,
  onClaimChange,
  onToggleClaimSelection,
  onSelectAllClaims,
  onDeselectOptionalClaims,
}: IdentityPickerProps) {
  const customIdentities = identities.filter(
    (m) => m.category !== 'PID' && m.category !== 'EAA Presets'
  );
  const pidIdentities = identities.filter((m) => !m.category || m.category === 'PID');
  const eaaIdentities = identities.filter((m) => m.category === 'EAA Presets');

  const groupedIdentities = [
    ...(customIdentities.length > 0
      ? [
          {
            label: '📥 Ausgestellte Credentials (OpenID4VCI)',
            items: customIdentities.map((m) => ({
              label: m.label,
              value: m.id,
              description: m.description,
            })),
          },
        ]
      : []),
    {
      label: '🆔 Personalausweis (PID)',
      items: pidIdentities.map((m) => ({
        label: m.label,
        value: m.id,
        description: m.description,
      })),
    },
    {
      label: '💳 EAA Credential Presets (Branchen-Szenarien)',
      items: eaaIdentities.map((m) => ({
        label: m.label,
        value: m.id,
        description: m.description,
      })),
    },
  ];

  return (
    <Card title="Daten & Identität" className="mb-2">
      <div className="flex flex-column gap-3">
        <div className="flex align-items-center gap-2">
          <label className="text-sm font-medium" style={{ minWidth: '7.5rem' }}>
            Identität / Preset
          </label>
          <Dropdown
            value={selectedIdentityId}
            options={groupedIdentities}
            optionGroupLabel="label"
            optionGroupChildren="items"
            onChange={(e) => onIdentityChange(e.value)}
            className="flex-1"
            itemTemplate={(option) => (
              <div className="flex flex-column py-1">
                <span className="font-semibold text-sm">{option.label}</span>
                {option.description && (
                  <span className="text-xs text-color-secondary">{option.description}</span>
                )}
              </div>
            )}
          />
        </div>

        {simulateOneTimeUse && remainingCredentials !== undefined && (
          <div className="flex align-items-center p-2 border-round text-xs font-semibold" style={{ backgroundColor: 'var(--primary-color-thin, rgba(0,0,0,0.05))', color: 'var(--primary-color)', marginLeft: '7.5rem' }}>
            <span>🔋 Batch-Status: {remainingCredentials} / 5 verbleibend</span>
          </div>
        )}

        {claims.length > 0 && (
          <>
            <div className="flex align-items-center justify-content-between mt-2">
              <span className="text-xs font-semibold text-color-secondary">Selective Disclosure Steuerung:</span>
              <div className="flex gap-2">
                {onDeselectOptionalClaims && (
                  <Button
                    label="Alle optionalen abwählen"
                    icon="pi pi-filter-slash"
                    size="small"
                    severity="secondary"
                    outlined
                    type="button"
                    className="text-xs py-1 px-2"
                    onClick={onDeselectOptionalClaims}
                  />
                )}
                {onSelectAllClaims && (
                  <Button
                    label="Alle auswählen"
                    icon="pi pi-check-square"
                    size="small"
                    severity="secondary"
                    outlined
                    type="button"
                    className="text-xs py-1 px-2"
                    onClick={onSelectAllClaims}
                  />
                )}
              </div>
            </div>

            <DataTable key={selectedIdentityId} value={claims} size="small" className="mt-1">
              <Column
                header="Freigabe"
                style={{ width: '4rem' }}
                body={(c: ExtractedClaim) => (
                  <Checkbox
                    checked={selectedClaims[c.key] !== false}
                    onChange={() => onToggleClaimSelection(c.key)}
                  />
                )}
              />
              <Column field="label" header="Feld" style={{ width: '20%' }} />
              <Column
                header="Typ"
                style={{ width: '7rem' }}
                body={(c: ExtractedClaim) => (
                  <Tag
                    value={c.essential ? 'Pflicht' : 'Optional'}
                    severity={c.essential ? 'danger' : 'info'}
                    className="text-xs"
                  />
                )}
              />
              <Column
                header="Wert"
                body={(c: ExtractedClaim) => (
                  <InputText
                    value={claimValues[c.key] ?? ''}
                    onChange={(e) => onClaimChange(c.key, e.target.value)}
                    className="w-full"
                    size="small"
                    disabled={selectedClaims[c.key] === false}
                    style={{ padding: '0.35rem 0.5rem' }}
                  />
                )}
              />
              <Column field="key" header="Claim" style={{ width: '18%' }} />
              <Column field="path" header="Pfad" body={(r) => <span className="font-mono text-xs">{r.path}</span>} />
            </DataTable>
          </>
        )}
      </div>
    </Card>
  );
}
