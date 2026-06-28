import { Card } from 'primereact/card';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import type { ExtractedClaim } from '../types/openid4vp';
import { mockIdentities } from '../data/mockIdentities';

interface IdentityPickerProps {
  claims: ExtractedClaim[];
  selectedIdentityId: string;
  claimValues: Record<string, string>;
  onIdentityChange: (id: string) => void;
  onClaimChange: (key: string, value: string) => void;
}

export function IdentityPicker({
  claims,
  selectedIdentityId,
  claimValues,
  onIdentityChange,
  onClaimChange,
}: IdentityPickerProps) {
  return (
    <Card title="3. Daten & Identität" className="mb-2">
      {claims.length > 0 && (
        <DataTable value={claims} size="small" className="mb-3">
          <Column field="label" header="Feld" />
          <Column field="key" header="Claim" />
          <Column field="path" header="Pfad" body={(r) => <span className="font-mono text-xs">{r.path}</span>} />
        </DataTable>
      )}

      <div className="flex flex-column gap-3">
        <div className="flex align-items-center gap-2">
          <label className="text-sm font-medium" style={{ minWidth: '6rem' }}>
            Identität
          </label>
          <Dropdown
            value={selectedIdentityId}
            options={mockIdentities.map((m) => ({ label: m.label, value: m.id }))}
            onChange={(e) => onIdentityChange(e.value)}
            className="flex-1"
          />
        </div>

        {claims.map((c) => (
          <div key={c.key} className="flex align-items-center gap-2">
            <label className="text-sm font-medium" style={{ minWidth: '6rem' }}>
              {c.label}
            </label>
            <InputText
              value={claimValues[c.key] ?? ''}
              onChange={(e) => onClaimChange(c.key, e.target.value)}
              className="flex-1"
              size="small"
            />
          </div>
        ))}
      </div>
    </Card>
  );
}
