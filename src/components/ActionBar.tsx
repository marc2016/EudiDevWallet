import { Button } from 'primereact/button';
import { Message } from 'primereact/message';

interface ActionBarProps {
  onApprove: () => void;
  loading: boolean;
  disabled: boolean;
  lastResult?: { ok: boolean; message: string };
}

export function ActionBar({
  onApprove,
  loading,
  disabled,
  lastResult,
}: ActionBarProps) {
  return (
    <div className="action-bar surface-section border-top-1 surface-border p-3 mt-2">
      {lastResult?.ok ? (
        <Message severity="success" text={lastResult.message} className="mb-2 w-full" />
      ) : null}
      {lastResult && !lastResult.ok && (
        <Message severity="error" text={lastResult.message} className="mb-2 w-full" />
      )}
      <Button
        label="Freigeben"
        icon="pi pi-check"
        severity="success"
        onClick={onApprove}
        loading={loading}
        disabled={disabled}
        className="w-full"
      />
    </div>
  );
}
