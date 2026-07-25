import { useCallback, useEffect, useRef, useState } from 'react';
import { Icon } from '@mdi/react';
import { mdiCheckCircleOutline } from '@mdi/js';
import { Button } from 'primereact/button';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { Checkbox } from 'primereact/checkbox';
import { Tag } from 'primereact/tag';
import { ProgressSpinner } from 'primereact/progressspinner';
import { SelectiveDisclosureModal } from './SelectiveDisclosureModal';
import { CredentialWalletTab } from './CredentialWalletTab';
import type { useWalletFlow } from '../hooks/useWalletFlow';

type WalletFlow = ReturnType<typeof useWalletFlow>;

type SimpleStep =
  | 'url'
  | 'processing'
  | 'completed'
  | 'review'
  | 'issuance_review'
  | 'submitting'
  | 'result'
  | 'issuance_result'
  | 'error';

function SuccessIcon() {
  return (
    <Icon
      path={mdiCheckCircleOutline}
      size={2}
      className="simple-success-icon"
      aria-hidden
    />
  );
}

interface SimpleViewProps {
  flow: WalletFlow;
}

function initialStep(flow: WalletFlow): SimpleStep {
  if (flow.lastResult) return 'result';
  if (flow.issuedCredentialResult) return 'issuance_result';
  if (flow.isIssuanceFlow) return 'issuance_review';
  if (flow.request && flow.claims.length > 0) return 'review';
  return 'url';
}

export function SimpleView({ flow }: SimpleViewProps) {
  const [step, setStep] = useState<SimpleStep>(() => initialStep(flow));
  const [leavingStep, setLeavingStep] = useState<SimpleStep | null>(null);
  const [url, setUrl] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'request' | 'wallet'>('request');
  const skipTransitionRef = useRef(true);

  const stepRef = useRef(step);
  stepRef.current = step;

  const changeStep = useCallback((next: SimpleStep) => {
    const current = stepRef.current;
    if (current === next) return;
    if (!skipTransitionRef.current) {
      setLeavingStep(current);
    } else {
      skipTransitionRef.current = false;
    }
    setStep(next);
  }, []);

  const handleLeaveAnimationEnd = useCallback((e: React.AnimationEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    if (e.animationName === 'simple-slide-out-left') {
      setLeavingStep(null);
    }
  }, []);

  useEffect(() => {
    if (step !== 'completed') return;
    const timer = window.setTimeout(() => {
      if (flow.isIssuanceFlow) {
        changeStep('issuance_review');
      } else {
        changeStep('review');
      }
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [step, changeStep, flow.isIssuanceFlow]);

  const handleAnalyze = async () => {
    if (!url.trim()) return;
    changeStep('processing');
    const ok = await flow.handleAnalyze(url);
    changeStep(ok ? 'completed' : 'error');
  };

  const handleApprove = async () => {
    setShowModal(false);
    changeStep('submitting');
    const ok = await flow.handleApprove();
    changeStep(ok ? 'result' : 'error');
  };

  const handleIssueCredentialInline = async () => {
    changeStep('submitting');
    const ok = await flow.handleIssueCredential();
    changeStep(ok ? 'issuance_result' : 'error');
  };

  const handleReset = () => {
    flow.resetFlow();
    setUrl('');
    changeStep('url');
  };

  const customIdentities = flow.identities.filter(
    (m) => m.category !== 'PID' && m.category !== 'EAA Presets'
  );
  const pidIdentities = flow.identities.filter((m) => !m.category || m.category === 'PID');
  const eaaIdentities = flow.identities.filter((m) => m.category === 'EAA Presets');

  const groupedIdentities = [
    ...(customIdentities.length > 0
      ? [
          {
            label: '📥 Ausgestellte Credentials (OpenID4VCI)',
            items: customIdentities.map((m) => ({
              label: m.label,
              value: m.id,
              description: m.description,
            })),
          },
        ]
      : []),
    {
      label: '🆔 Personalausweis (PID)',
      items: pidIdentities.map((m) => ({
        label: m.label,
        value: m.id,
        description: m.description,
      })),
    },
    {
      label: '💳 EAA Presets (Branchen-Szenarien)',
      items: eaaIdentities.map((m) => ({
        label: m.label,
        value: m.id,
        description: m.description,
      })),
    },
  ];

  const renderStepContent = (activeStep: SimpleStep) => {
    switch (activeStep) {
      case 'url':
        return (
          <div className="simple-url-row">
            <InputText
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="openid4vp://… oder openid-credential-offer://…"
              className="flex-1"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && url.trim()) void handleAnalyze();
              }}
            />
            <Button
              icon="pi pi-file-import"
              onClick={async () => {
                try {
                  const text = await navigator.clipboard.readText();
                  setUrl(text);
                } catch (err) {
                  console.error('Failed to read clipboard: ', err);
                }
              }}
              aria-label="Aus Zwischenablage einfügen"
              severity="secondary"
            />
            <Button
              icon="pi pi-arrow-right"
              onClick={() => void handleAnalyze()}
              disabled={!url.trim()}
              aria-label="Analysieren"
            />
          </div>
        );

      case 'processing':
      case 'submitting':
        return (
          <div className="simple-status">
            <ProgressSpinner style={{ width: '2rem', height: '2rem' }} strokeWidth="4" />
            <span>Processing…</span>
          </div>
        );

      case 'completed':
        return (
          <div className="simple-status simple-status--success">
            <SuccessIcon />
            <span>Completed</span>
          </div>
        );

      case 'issuance_review': {
        const offer = flow.issuanceOffer;
        if (!offer) return null;
        const requiresPin =
          offer.grants?.['urn:ietf:params:oauth:grant-type:pre-authorized_code']?.user_pin_required;

        return (
          <>
            <div className="flex align-items-center justify-content-between mb-2">
              <h2 className="simple-heading mb-0">📥 Credential Ausstellung (OpenID4VCI)</h2>
              <Tag value={offer.credential_configuration_ids[0] ?? 'VC'} severity="info" />
            </div>

            <div className="surface-100 p-3 border-round mb-3 text-sm">
              <div className="font-semibold text-base mb-1">
                {offer.display_name || 'Neues Credential'}
              </div>
              <div className="text-xs text-color-secondary mb-2">
                Issuer: <code>{offer.credential_issuer}</code>
              </div>

              {requiresPin && (
                <div className="mt-3">
                  <label className="block text-xs font-semibold mb-1">
                    Authentifizierung — 6-stelliger PIN / TxCode:
                  </label>
                  <InputText
                    value={flow.issuancePinInput}
                    onChange={(e) => flow.setIssuancePinInput(e.target.value)}
                    maxLength={6}
                    className="w-full text-center text-lg font-mono tracking-widest mb-1"
                    placeholder="123456"
                  />
                  {flow.issuancePinError && (
                    <div className="text-red-500 text-xs font-semibold mb-1">
                      {flow.issuancePinError}
                    </div>
                  )}
                  <div className="text-xs text-blue-600">
                    💡 Test-PIN: <strong>123456</strong>
                  </div>
                </div>
              )}
            </div>

            <div className="simple-review-actions">
              <Button
                label="Credential empfangen & in Wallet speichern"
                icon="pi pi-download"
                severity="success"
                className="w-full"
                onClick={() => void handleIssueCredentialInline()}
              />
            </div>
          </>
        );
      }

      case 'issuance_result': {
        const result = flow.issuedCredentialResult;
        return (
          <>
            <div className="simple-result-success">
              <SuccessIcon />
              <span>Credential erfolgreich empfangen!</span>
            </div>
            <p className="text-sm text-color-secondary text-center mt-2 mb-3">
              Das Credential <strong>{result?.identity.label}</strong> wurde in deiner Wallet gespeichert und steht ab sofort im IdentityPicker bereit.
            </p>
            <div className="simple-result-actions">
              <Button label="Neue Anfrage / Credential" onClick={handleReset} />
            </div>
          </>
        );
      }

      case 'review': {
        const totalDisclosed = flow.claims.filter((c) => flow.selectedClaims[c.key] !== false).length;
        const totalOmitted = flow.claims.length - totalDisclosed;

        return (
          <>
            <div className="flex align-items-center justify-content-between mb-2">
              <h2 className="simple-heading mb-0">Angefragte Daten</h2>
              <div className="flex gap-1">
                <Button
                  label="Optional abwählen"
                  icon="pi pi-filter-slash"
                  size="small"
                  severity="secondary"
                  outlined
                  type="button"
                  className="text-xs py-1 px-2"
                  onClick={flow.deselectOptionalClaims}
                />
                <Button
                  label="Alle"
                  icon="pi pi-check-square"
                  size="small"
                  severity="secondary"
                  outlined
                  type="button"
                  className="text-xs py-1 px-2"
                  onClick={flow.selectAllClaims}
                />
              </div>
            </div>

            <table className="simple-review-table">
              <thead>
                <tr>
                  <th style={{ width: '2.5rem' }}>Freigabe</th>
                  <th>Anfrage</th>
                  <th>Wert</th>
                </tr>
              </thead>
              <tbody>
                {flow.claims.map((c) => (
                  <tr key={c.key} style={{ opacity: flow.selectedClaims[c.key] === false ? 0.6 : 1 }}>
                    <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                      <Checkbox
                        checked={flow.selectedClaims[c.key] !== false}
                        onChange={() => flow.toggleClaimSelection(c.key)}
                      />
                    </td>
                    <td>
                      <div className="flex align-items-center gap-2">
                        <span style={{ textDecoration: flow.selectedClaims[c.key] === false ? 'line-through' : 'none' }}>
                          {c.label}
                        </span>
                        <Tag
                          value={c.essential ? 'Pflicht' : 'Optional'}
                          severity={c.essential ? 'danger' : 'info'}
                          className="text-xs"
                          style={{ fontSize: '0.65rem', padding: '0.1rem 0.35rem' }}
                        />
                      </div>
                    </td>
                    <td style={{ color: flow.selectedClaims[c.key] === false ? 'var(--text-color-secondary)' : 'inherit' }}>
                      {flow.selectedClaims[c.key] === false ? (
                        <span className="text-xs text-orange-500 font-semibold">Unterdrückt</span>
                      ) : (
                        flow.claimValues[c.key] || '—'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="simple-review-actions">
              {totalOmitted > 0 && (
                <div className="p-2 border-round text-xs font-semibold text-center surface-200 text-primary">
                  🛡️ Selective Disclosure: {totalOmitted} von {flow.claims.length} Attributen unterdrückt
                </div>
              )}
              <Dropdown
                value={flow.selectedIdentityId}
                options={groupedIdentities}
                optionGroupLabel="label"
                optionGroupChildren="items"
                onChange={(e) => flow.handleIdentityChange(e.value)}
                className="w-full"
                placeholder="Identität / Preset wählen"
              />
              {flow.simulateOneTimeUse && (
                <div className="flex align-items-center justify-content-between p-2 border-round text-xs font-semibold" style={{ backgroundColor: 'var(--primary-color-thin, rgba(0,0,0,0.05))', color: 'var(--primary-color)' }}>
                  <span>🔋 Batch-Status:</span>
                  <span>{flow.remainingCredentials} / 5 verbleibend</span>
                </div>
              )}
              {flow.disabledReason && (
                <p className="simple-hint text-color-secondary">{flow.disabledReason}</p>
              )}
              <div className="flex gap-2">
                <Button
                  label="Vorschau"
                  icon="pi pi-eye"
                  severity="info"
                  outlined
                  className="flex-1"
                  onClick={() => setShowModal(true)}
                  disabled={Boolean(flow.disabledReason)}
                />
                <Button
                  label="Freigeben"
                  icon="pi pi-check"
                  severity="success"
                  className="flex-1"
                  onClick={() => void handleApprove()}
                  disabled={Boolean(flow.disabledReason)}
                />
              </div>
            </div>
          </>
        );
      }

      case 'result':
        if (!flow.lastResult) return null;
        if (flow.lastResult.ok) {
          return (
            <>
              <div className="simple-result-success">
                <SuccessIcon />
                <span>Erfolgreich freigegeben</span>
              </div>
              {flow.claims.length > 0 ? (
                <table className="simple-review-table mt-3">
                  <thead>
                    <tr>
                      <th>Feld</th>
                      <th>Freigegeben</th>
                    </tr>
                  </thead>
                  <tbody>
                    {flow.claims
                      .filter((c) => flow.selectedClaims[c.key] !== false)
                      .map((c) => (
                        <tr key={c.key}>
                          <td>{c.label}</td>
                          <td>{flow.claimValues[c.key] || '—'}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              ) : null}
              <div className="simple-result-actions">
                <Button label="Neue Anfrage" onClick={handleReset} />
              </div>
            </>
          );
        }
        return (
          <>
            <div className="simple-status simple-status--error">
              <i className="pi pi-times" />
              <span>{flow.lastResult.message}</span>
            </div>
            <div className="simple-result-actions">
              <Button label="Neue Anfrage" onClick={handleReset} />
            </div>
          </>
        );

      case 'error':
        return (
          <>
            <div className="simple-status simple-status--error">
              <i className="pi pi-times" />
              <span>{flow.lastError ?? 'Ein Fehler ist aufgetreten'}</span>
            </div>
            <Button label="Erneut versuchen" className="mt-3" onClick={handleReset} />
          </>
        );
    }
  };

  return (
    <div className="simple-view">
      {/* App brand — always visible above tabs */}
      <div className="simple-brand">
        <img src="/logo.png?v=2" alt="EudiDevWallet" className="simple-logo" />
        <h1 className="simple-title">EudiDevWallet</h1>
      </div>

      {/* Tab bar */}
      <div className="simple-tab-bar">
        <button
          id="tab-request"
          className={`simple-tab-btn ${activeTab === 'request' ? 'simple-tab-btn--active' : ''}`}
          onClick={() => setActiveTab('request')}
          aria-selected={activeTab === 'request'}
          role="tab"
        >
          <i className="pi pi-link" />
          Anfrage
        </button>
        <button
          id="tab-wallet"
          className={`simple-tab-btn ${activeTab === 'wallet' ? 'simple-tab-btn--active' : ''}`}
          onClick={() => setActiveTab('wallet')}
          aria-selected={activeTab === 'wallet'}
          role="tab"
        >
          <i className="pi pi-wallet" />
          Mein Wallet
          {flow.identities.filter((i) => i.category !== 'PID' && i.category !== 'EAA Presets').length > 0 && (
            <span className="simple-tab-badge">
              {flow.identities.filter((i) => i.category !== 'PID' && i.category !== 'EAA Presets').length}
            </span>
          )}
        </button>
      </div>

      {activeTab === 'request' ? (
        <div className="simple-view-stage">
          <div className="simple-view-content">
            {leavingStep && (
              <div className="simple-step-panel simple-step-panel--leave">
                <div className="simple-step-inner" onAnimationEnd={handleLeaveAnimationEnd}>
                  {renderStepContent(leavingStep)}
                </div>
              </div>
            )}
            <div className={`simple-step-panel ${leavingStep ? 'simple-step-panel--enter' : ''}`}>
              <div className="simple-step-inner" key={step}>
                {renderStepContent(step)}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="simple-wallet-stage">
          <CredentialWalletTab
            identities={flow.identities}
            onRemove={flow.removeIdentity}
            onClearAll={flow.clearAllCustomIdentities}
          />
        </div>
      )}

      <SelectiveDisclosureModal
        visible={showModal}
        onHide={() => setShowModal(false)}
        onApprove={() => void handleApprove()}
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
