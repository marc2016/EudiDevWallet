import { useCallback, useEffect, useRef, useState } from 'react';
import { Icon } from '@mdi/react';
import { mdiCheckCircleOutline } from '@mdi/js';
import { Button } from 'primereact/button';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { Checkbox } from 'primereact/checkbox';
import { ProgressSpinner } from 'primereact/progressspinner';
import { mockIdentities } from '../data/mockIdentities';
import type { useWalletFlow } from '../hooks/useWalletFlow';

type WalletFlow = ReturnType<typeof useWalletFlow>;

type SimpleStep = 'url' | 'processing' | 'completed' | 'review' | 'submitting' | 'result' | 'error';

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
  if (flow.request && flow.claims.length > 0) return 'review';
  return 'url';
}

export function SimpleView({ flow }: SimpleViewProps) {
  const [step, setStep] = useState<SimpleStep>(() => initialStep(flow));
  const [leavingStep, setLeavingStep] = useState<SimpleStep | null>(null);
  const [url, setUrl] = useState('');
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
    const timer = window.setTimeout(() => changeStep('review'), 1000);
    return () => window.clearTimeout(timer);
  }, [step, changeStep]);

  const handleAnalyze = async () => {
    if (!url.trim()) return;
    changeStep('processing');
    const ok = await flow.handleAnalyze(url);
    changeStep(ok ? 'completed' : 'error');
  };

  const handleApprove = async () => {
    changeStep('submitting');
    const ok = await flow.handleApprove();
    changeStep(ok ? 'result' : 'error');
  };

  const handleReset = () => {
    flow.resetFlow();
    setUrl('');
    changeStep('url');
  };

  const identityOptions = mockIdentities.map((m) => ({ label: m.label, value: m.id }));

  const renderStepContent = (activeStep: SimpleStep) => {
    switch (activeStep) {
      case 'url':
        return (
          <div className="simple-url-row">
            <InputText
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="OpenID4VP URL"
              className="flex-1"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && url.trim()) void handleAnalyze();
              }}
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

      case 'review':
        return (
          <>
            <h2 className="simple-heading">Angefragt</h2>
            <table className="simple-review-table">
              <thead>
                <tr>
                  <th style={{ width: '3rem' }}>Freigabe</th>
                  <th>Anfrage</th>
                  <th>Antwort</th>
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
                    <td style={{ textDecoration: flow.selectedClaims[c.key] === false ? 'line-through' : 'none' }}>
                      {c.label}
                    </td>
                    <td style={{ color: flow.selectedClaims[c.key] === false ? 'var(--text-color-secondary)' : 'inherit' }}>
                      {flow.claimValues[c.key] || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="simple-review-actions">
              <Dropdown
                value={flow.selectedIdentityId}
                options={identityOptions}
                onChange={(e) => flow.handleIdentityChange(e.value)}
                className="w-full"
                placeholder="Identität wählen"
              />
              {flow.disabledReason && (
                <p className="simple-hint text-color-secondary">{flow.disabledReason}</p>
              )}
              <Button
                label="Freigeben"
                icon="pi pi-check"
                severity="success"
                className="w-full"
                onClick={() => void handleApprove()}
                disabled={Boolean(flow.disabledReason)}
              />
            </div>
          </>
        );

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
      <div className="simple-view-stage">
        <div className="simple-brand">
          <img src="/logo.png" alt="EudiDevWallet" className="simple-logo" />
          <h1 className="simple-title">EudiDevWallet</h1>
        </div>

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
    </div>
  );
}
