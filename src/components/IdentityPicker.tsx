import { Card } from 'primereact/card';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { Checkbox } from 'primereact/checkbox';
import type { ExtractedClaim } from '../types/openid4vp';
import { mockIdentities } from '../data/mockIdentities';

interface IdentityPickerProps {
  claims: ExtractedClaim[];
  selectedIdentityId: string;
  claimValues: Record<string, string>;
  selectedClaims: Record<string, boolean>;
  simulateOneTimeUse?: boolean;
  remainingCredentials?: number;
  onIdentityChange: (id: string) => void;
  onClaimChange: (key: string, value: string) => void;
  onToggleClaimSelection: (key: string) => void;
}

export function IdentityPicker({
  claims,
  selectedIdentityId,
  claimValues,
  selectedClaims,
  simulateOneTimeUse,
  remainingCredentials,
  onIdentityChange,
  onClaimChange,
  onToggleClaimSelection,
}: IdentityPickerProps) {
  return (
    <Card title="3. Daten & Identität" className="mb-2">
      {claims.length > 0 && (
        <DataTable value={claims} size="small" className="mb-3">
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
          <Column field="label" header="Feld" />
          <Column field="key" header="Claim" />
          <Column field="path" header="Pfad" body={(r) => <span className="font-mono text-xs">{r.path}</span>} />
        </DataTable>
      )}

      <div className="flex flex-column gap-3">
        <div className="flex align-items-center gap-2">
          <label className="text-sm font-medium" style={{ minWidth: '7.5rem' }}>
            Identität
          </label>
          <Dropdown
            value={selectedIdentityId}
            options={mockIdentities.map((m) => ({ label: m.label, value: m.id }))}
            onChange={(e) => onIdentityChange(e.value)}
            className="flex-1"
          />
        </div>

        {simulateOneTimeUse && remainingCredentials !== undefined && (
          <div className="flex align-items-center p-2 border-round text-xs font-semibold" style={{ backgroundColor: 'var(--primary-color-thin, rgba(0,0,0,0.05))', color: 'var(--primary-color)', marginLeft: '7.5rem' }}>
            <span>🔋 Batch-Status: {remainingCredentials} / 5 verbleibend</span>
          </div>
        )}

        {claims.map((c) => (
          <div key={c.key} className="flex align-items-center gap-2" style={{ opacity: selectedClaims[c.key] === false ? 0.6 : 1 }}>
            <div className="flex align-items-center justify-content-center" style={{ width: '1.5rem' }}>
              <Checkbox
                checked={selectedClaims[c.key] !== false}
                onChange={() => onToggleClaimSelection(c.key)}
              />
            </div>
            <label className="text-sm font-medium" style={{ minWidth: '6rem' }}>
              {c.label}
            </label>
            <InputText
              value={claimValues[c.key] ?? ''}
              onChange={(e) => onClaimChange(c.key, e.target.value)}
              className="flex-1"
              size="small"
              disabled={selectedClaims[c.key] === false}
            />
          </div>
        ))}
      </div>
    </Card>
  );
}
