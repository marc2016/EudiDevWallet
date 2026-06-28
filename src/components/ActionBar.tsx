import { Button } from 'primereact/button';
import { Message } from 'primereact/message';

interface ActionBarProps {
  onApprove: () => void;
  loading: boolean;
  disabled: boolean;
  disabledReason?: string;
  lastResult?: { ok: boolean; message: string };
}

export function ActionBar({
  onApprove,
  loading,
  disabled,
  disabledReason,
  lastResult,
}: ActionBarProps) {
  return (
    <div className="action-bar surface-section border-top-1 surface-border p-3 mt-2">
      {disabled && disabledReason && (
        <Message severity="warn" text={disabledReason} className="mb-2 w-full" />
      )}
      {lastResult && (
        <Message
          severity={lastResult.ok ? 'success' : 'error'}
          text={lastResult.message}
          className="mb-2 w-full"
        />
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
