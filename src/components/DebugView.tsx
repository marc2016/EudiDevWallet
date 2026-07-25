import { useState, type RefObject } from 'react';
import { Toast } from 'primereact/toast';
import { AppHeader } from './AppHeader';
import { RequestInput } from './RequestInput';
import { RequestSummary } from './RequestSummary';
import { IdentityPicker } from './IdentityPicker';
import { ActionBar } from './ActionBar';
import { ActivityLogPanel } from './ActivityLogPanel';
import { SelectiveDisclosureModal } from './SelectiveDisclosureModal';
import type { useWalletFlow } from '../hooks/useWalletFlow';

type WalletFlow = ReturnType<typeof useWalletFlow>;

interface DebugViewProps {
  flow: WalletFlow;
  toast: RefObject<Toast | null>;
}

export function DebugView({ flow, toast }: DebugViewProps) {
  const [showModal, setShowModal] = useState(false);

  const handleApproveFromModal = async () => {
    const ok = await flow.handleApprove();
    if (ok) {
      setShowModal(false);
    }
  };

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
              onSelectAllClaims={flow.selectAllClaims}
              onDeselectOptionalClaims={flow.deselectOptionalClaims}
            />
            <ActionBar
              onApprove={flow.handleApprove}
              onPreview={() => setShowModal(true)}
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

      <SelectiveDisclosureModal
        visible={showModal}
        onHide={() => setShowModal(false)}
        onApprove={() => void handleApproveFromModal()}
        submitting={flow.submitting}
        request={flow.request}
        certResult={flow.certResult}
        claims={flow.claims}
        selectedClaims={flow.selectedClaims}
        claimValues={flow.claimValues}
        onToggleClaimSelection={flow.toggleClaimSelection}
        onSelectAllClaims={flow.selectAllClaims}
        onDeselectOptionalClaims={flow.deselectOptionalClaims}
      />
    </div>
  );
}
