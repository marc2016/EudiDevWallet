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
                trustAnchorMode: flow.trustAnchorMode,
                customTrustAnchors: flow.customTrustAnchors,
                responseMode: flow.responseMode,
                credentialFormat: flow.credentialFormat,
                simulateOneTimeUse: flow.simulateOneTimeUse,
                onCertificateModeChange: flow.setCertificateMode,
                onTrustAnchorModeChange: flow.setTrustAnchorMode,
                onCustomTrustAnchorsChange: flow.setCustomTrustAnchors,
                onResponseModeChange: flow.setResponseMode,
                onCredentialFormatChange: flow.setCredentialFormat,
                onSimulateOneTimeUseChange: flow.setSimulateOneTimeUse,
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
              selectedClaims={flow.selectedClaims}
              simulateOneTimeUse={flow.simulateOneTimeUse}
              remainingCredentials={flow.remainingCredentials}
              onIdentityChange={flow.handleIdentityChange}
              onClaimChange={(key, value) =>
                flow.setClaimValues((prev) => ({ ...prev, [key]: value }))
              }
              onToggleClaimSelection={flow.toggleClaimSelection}
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
