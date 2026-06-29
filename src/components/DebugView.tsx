import { Toast } from 'primereact/toast';
import type { RefObject } from 'react';
import { AppHeader } from './AppHeader';
import { RequestInput } from './RequestInput';
import { RequestSummary } from './RequestSummary';
import { IdentityPicker } from './IdentityPicker';
import { ActionBar } from './ActionBar';
import { ActivityLogPanel } from './ActivityLogPanel';
import type { useWalletFlow } from '../hooks/useWalletFlow';

type WalletFlow = ReturnType<typeof useWalletFlow>;

interface DebugViewProps {
  flow: WalletFlow;
  toast: RefObject<Toast | null>;
}

export function DebugView({ flow, toast }: DebugViewProps) {
  return (
    <div className="app-shell">
      <Toast ref={toast} />
      <AppHeader />

      <div className="app-body">
        <div className="app-main">
          <div className="workflow-column">
            <RequestInput
              onAnalyze={flow.handleAnalyze}
              loading={flow.analyzing}
              settings={{
                certificateMode: flow.certificateMode,
                responseMode: flow.responseMode,
                onCertificateModeChange: flow.setCertificateMode,
                onResponseModeChange: flow.setResponseMode,
              }}
            />
            <RequestSummary
              request={flow.request}
              certMode={flow.certificateMode}
              certResult={flow.certResult}
            />
            <IdentityPicker
              claims={flow.claims}
              selectedIdentityId={flow.selectedIdentityId}
              claimValues={flow.claimValues}
              onIdentityChange={flow.handleIdentityChange}
              onClaimChange={(key, value) =>
                flow.setClaimValues((prev) => ({ ...prev, [key]: value }))
              }
            />
            <ActionBar
              onApprove={flow.handleApprove}
              loading={flow.submitting}
              disabled={Boolean(flow.disabledReason)}
              lastResult={flow.lastResult}
            />
          </div>
          <div className="log-column">
            <ActivityLogPanel />
          </div>
        </div>
      </div>
    </div>
  );
}
