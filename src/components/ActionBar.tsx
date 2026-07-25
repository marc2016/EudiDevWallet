import { Button } from 'primereact/button';
import { Message } from 'primereact/message';

interface ActionBarProps {
  onApprove: () => void;
  onPreview?: () => void;
  loading: boolean;
  disabled: boolean;
  lastResult?: { ok: boolean; message: string };
}

export function ActionBar({
  onApprove,
  onPreview,
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
      <div className="flex gap-2">
        {onPreview && (
          <Button
            label="Freigabe-Vorschau"
            icon="pi pi-eye"
            severity="info"
            onClick={onPreview}
            disabled={disabled || loading}
            className="flex-1"
          />
        )}
        <Button
          label="Freigeben"
          icon="pi pi-check"
          severity="success"
          onClick={onApprove}
          loading={loading}
          disabled={disabled}
          className="flex-1"
        />
      </div>
    </div>
  );
}
