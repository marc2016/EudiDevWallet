import { useState } from 'react';
import { AppHeader } from './AppHeader';
import { RequestInput } from './RequestInput';
import { RequestSummary } from './RequestSummary';
import { IdentityPicker } from './IdentityPicker';
import { ActionBar } from './ActionBar';
import { ActivityLogPanel } from './ActivityLogPanel';
import { SelectiveDisclosureModal } from './SelectiveDisclosureModal';
import { CredentialWalletTab } from './CredentialWalletTab';
import type { useWalletFlow } from '../hooks/useWalletFlow';
import { useTranslation } from '../i18n/LanguageContext';

type WalletFlow = ReturnType<typeof useWalletFlow>;

interface DebugViewProps {
  flow: WalletFlow;
}

export function DebugView({ flow }: DebugViewProps) {
  const { t } = useTranslation();
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'request' | 'wallet'>('request');

  const handleApproveFromModal = async () => {
    const ok = await flow.handleApprove();
    if (ok) {
      setShowModal(false);
    }
  };

  const hasNextStep = Boolean(flow.request || flow.issuanceOffer);

  return (
    <div className="app-shell">
      <AppHeader />

      <div className="app-body">
        <div className="app-main">
          <div className="workflow-column">
            {/* Tab bar */}
            <div className="debug-tab-bar">
              <button
                id="debug-tab-request"
                className={`simple-tab-btn ${activeTab === 'request' ? 'simple-tab-btn--active' : ''}`}
                onClick={() => setActiveTab('request')}
                aria-selected={activeTab === 'request'}
                role="tab"
              >
                <i className="pi pi-link" />
                {t('tab.request')}
              </button>
              <button
                id="debug-tab-wallet"
                className={`simple-tab-btn ${activeTab === 'wallet' ? 'simple-tab-btn--active' : ''}`}
                onClick={() => setActiveTab('wallet')}
                aria-selected={activeTab === 'wallet'}
                role="tab"
              >
                <i className="pi pi-wallet" />
                {t('tab.wallet')}
                {flow.identities.filter((i) => i.category !== 'PID' && i.category !== 'EAA Presets').length > 0 && (
                  <span className="simple-tab-badge">
                    {flow.identities.filter((i) => i.category !== 'PID' && i.category !== 'EAA Presets').length}
                  </span>
                )}
              </button>
            </div>

            {activeTab === 'request' ? (
              <>
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
                {hasNextStep && (
                  <div className="next-steps-animated">
                    {flow.isIssuanceFlow && flow.issuanceOffer ? (
                      <>
                        {/* Card 2: Issuer Info */}
                        <div className="p-card p-component p-3">
                          <h3 className="text-lg font-bold mt-0 mb-3">
                            OpenID4VCI Credential Ausstellung
                          </h3>

                          <div className="flex flex-column gap-2 mb-3">
                            <div className="text-sm">
                              <span className="text-color-secondary text-xs font-semibold uppercase" style={{ letterSpacing: '0.05em' }}>Issuer</span>
                              <div className="mt-1 font-mono text-xs word-break-all">{flow.issuanceOffer.credential_issuer}</div>
                            </div>

                            <div className="text-sm">
                              <span className="text-color-secondary text-xs font-semibold uppercase" style={{ letterSpacing: '0.05em' }}>Credential-Typ</span>
                              <div className="mt-1 font-semibold">
                                {flow.issuanceOffer.display_name && !flow.issuanceOffer.display_name.includes('Offer')
                                  ? flow.issuanceOffer.display_name
                                  : flow.issuanceOffer.credential_configuration_ids[0]}
                              </div>
                            </div>

                            {flow.issuanceOffer.credential_configuration_ids.length > 1 && (
                              <div className="text-sm">
                                <span className="text-color-secondary text-xs font-semibold uppercase" style={{ letterSpacing: '0.05em' }}>Alle Typen</span>
                                <div className="mt-1">
                                  {flow.issuanceOffer.credential_configuration_ids.map((id) => (
                                    <span key={id} className="p-tag p-tag-secondary mr-1 text-xs">{id}</span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {flow.issuanceOffer.grants?.['urn:ietf:params:oauth:grant-type:pre-authorized_code'] && (
                              <div className="text-sm">
                                <span className="text-color-secondary text-xs font-semibold uppercase" style={{ letterSpacing: '0.05em' }}>Grant-Typ</span>
                                <div className="mt-1 font-mono text-xs">Pre-Authorized Code</div>
                              </div>
                            )}

                            {flow.issuanceOffer.notification_endpoint && (
                              <div className="text-sm">
                                <span className="text-color-secondary text-xs font-semibold uppercase" style={{ letterSpacing: '0.05em' }}>Notification Endpoint</span>
                                <div className="mt-1 font-mono text-xs word-break-all">{flow.issuanceOffer.notification_endpoint}</div>
                              </div>
                            )}
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

                          {!flow.issuedCredentialResult && (
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

                        {/* Card 3: Result — only shown after issuance, slides in from bottom */}
                        {flow.issuedCredentialResult && (
                          <div className="p-card p-component p-3 card-slide-in">
                            <div className="flex align-items-center gap-2 mb-3">
                              <span className="pi pi-check-circle text-green-500" style={{ fontSize: '1.25rem' }} />
                              <h3 className="text-lg font-bold m-0 text-green-600">
                                Credential erfolgreich ausgestellt
                              </h3>
                            </div>

                            <div className="flex flex-column gap-2">
                              <div className="text-sm">
                                <span className="text-color-secondary text-xs font-semibold uppercase" style={{ letterSpacing: '0.05em' }}>Name</span>
                                <div className="mt-1 font-semibold">{flow.issuedCredentialResult.identity.label}</div>
                              </div>

                              {flow.issuedCredentialResult.identity.description && !flow.issuedCredentialResult.identity.description.startsWith('Erfolgreich von') && (
                                <div className="text-sm">
                                  <span className="text-color-secondary text-xs font-semibold uppercase" style={{ letterSpacing: '0.05em' }}>Beschreibung</span>
                                  <div className="mt-1">{flow.issuedCredentialResult.identity.description}</div>
                                </div>
                              )}

                              {flow.issuedCredentialResult.format && (
                                <div className="text-sm">
                                  <span className="text-color-secondary text-xs font-semibold uppercase" style={{ letterSpacing: '0.05em' }}>Format</span>
                                  <div className="mt-1 font-mono text-xs">{flow.issuedCredentialResult.format}</div>
                                </div>
                              )}

                              {Object.keys(flow.issuedCredentialResult.identity.claims).length > 0 && (
                                <div className="text-sm">
                                  <span className="text-color-secondary text-xs font-semibold uppercase" style={{ letterSpacing: '0.05em' }}>Claims</span>
                                  <div className="mt-2 flex flex-column gap-1">
                                    {Object.entries(flow.issuedCredentialResult.identity.claims).map(([key, value]) => (
                                      <div key={key} className="flex align-items-start gap-2 text-xs">
                                        <span className="font-semibold" style={{ minWidth: '8rem', color: 'var(--text-color-secondary)' }}>{key}</span>
                                        <span className="word-break-all">{value}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {flow.issuedCredentialResult.credentialId && (
                                <div className="text-sm">
                                  <span className="text-color-secondary text-xs font-semibold uppercase" style={{ letterSpacing: '0.05em' }}>Credential ID</span>
                                  <div className="mt-1 font-mono text-xs word-break-all">{flow.issuedCredentialResult.credentialId}</div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </>
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
                )}
              </>
            ) : (
              <div className="debug-wallet-stage">
                <CredentialWalletTab
                  identities={flow.identities}
                  onRemove={flow.removeIdentity}
                  onClearAll={flow.clearAllCustomIdentities}
                />
              </div>
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
