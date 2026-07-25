import { useState } from 'react';
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
}

export function DebugView({ flow }: DebugViewProps) {
  const [showModal, setShowModal] = useState(false);

  const handleApproveFromModal = async () => {
    const ok = await flow.handleApprove();
    if (ok) {
      setShowModal(false);
    }
  };

  return (
    <div className="app-shell">
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
            {flow.isIssuanceFlow && flow.issuanceOffer ? (
              <div className="p-card p-component mb-2 p-3">
                <h3 className="text-lg font-bold mt-0 mb-2">
                  📥 OpenID4VCI Credential Ausstellung
                </h3>
                <div className="text-sm mb-2">
                  <strong>Issuer:</strong> <code>{flow.issuanceOffer.credential_issuer}</code>
                </div>
                <div className="text-sm mb-2">
                  <strong>Typ / Name:</strong> {flow.issuanceOffer.display_name || flow.issuanceOffer.credential_configuration_ids[0]}
                </div>

                {flow.issuanceOffer.grants?.['urn:ietf:params:oauth:grant-type:pre-authorized_code']?.user_pin_required && (
                  <div className="my-3">
                    <label className="block text-xs font-semibold mb-1">
                      Authentifizierung — 6-stelliger PIN / TxCode:
                    </label>
                    <input
                      type="text"
                      value={flow.issuancePinInput}
                      onChange={(e) => flow.setIssuancePinInput(e.target.value)}
                      maxLength={6}
                      className="p-inputtext p-component w-full text-center text-lg font-mono tracking-widest"
                      placeholder="123456"
                    />
                    {flow.issuancePinError && (
                      <div className="text-red-500 text-xs font-semibold mt-1">
                        {flow.issuancePinError}
                      </div>
                    )}
                  </div>
                )}

                {flow.issuedCredentialResult ? (
                  <div className="p-2 border-round bg-green-100 text-green-800 text-xs font-semibold mb-2">
                    ✅ Credential "{flow.issuedCredentialResult.identity.label}" erfolgreich ausgestellt & in Wallet gespeichert!
                  </div>
                ) : (
                  <button
                    type="button"
                    className="p-button p-component p-button-success w-full mt-2"
                    onClick={() => void flow.handleIssueCredential()}
                    disabled={flow.submitting}
                  >
                    <span className="p-button-icon p-button-icon-left pi pi-download" />
                    <span className="p-button-label">Credential ausstellen & in Wallet speichern</span>
                  </button>
                )}
              </div>
            ) : (
              <>
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
                  identities={flow.identities}
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
              </>
            )}
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
