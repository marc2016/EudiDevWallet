import { useCallback, useMemo, useRef, useState } from 'react';
import { Toast } from 'primereact/toast';
import { Tag } from 'primereact/tag';
import { AppHeader } from './components/AppHeader';
import { WalletSettings } from './components/WalletSettings';
import { RequestInput } from './components/RequestInput';
import { RequestSummary } from './components/RequestSummary';
import { IdentityPicker } from './components/IdentityPicker';
import { ActionBar } from './components/ActionBar';
import { ActivityLogPanel } from './components/ActivityLogPanel';
import { ActivityLogProvider, useActivityLog } from './log/ActivityLogContext';
import { resolveAuthorizationRequest } from './lib/fetchRequestObject';
import { extractClaims } from './lib/extractClaims';
import { validateCertificates } from './lib/validateCertificates';
import { buildResponse } from './lib/buildResponse';
import { sendResponse } from './lib/sendResponse';
import {
  loadCertificateMode,
  loadResponseMode,
  resolveResponseMode,
} from './settings/walletSettings';
import { mockIdentities } from './data/mockIdentities';
import type {
  AuthorizationRequest,
  CertificateMode,
  CertificateValidationResult,
  ExtractedClaim,
  ResponseMode,
} from './types/openid4vp';

function AppContent() {
  const toast = useRef<Toast>(null);
  const { log } = useActivityLog();

  const [certificateMode, setCertificateMode] = useState<CertificateMode>(loadCertificateMode);
  const [responseMode, setResponseMode] = useState<ResponseMode>(loadResponseMode);
  const [request, setRequest] = useState<AuthorizationRequest | null>(null);
  const [claims, setClaims] = useState<ExtractedClaim[]>([]);
  const [certResult, setCertResult] = useState<CertificateValidationResult | null>(null);
  const [selectedIdentityId, setSelectedIdentityId] = useState(mockIdentities[0].id);
  const [claimValues, setClaimValues] = useState<Record<string, string>>({});
  const [analyzing, setAnalyzing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [lastResult, setLastResult] = useState<{ ok: boolean; message: string } | undefined>();

  const applyIdentity = useCallback(
    (id: string, extracted: ExtractedClaim[]) => {
      const identity = mockIdentities.find((m) => m.id === id) ?? mockIdentities[0];
      const values: Record<string, string> = {};
      for (const c of extracted) {
        values[c.key] = identity.claims[c.key] ?? '';
      }
      setClaimValues(values);
    },
    [],
  );

  const handleAnalyze = async (input: string) => {
    setAnalyzing(true);
    setLastResult(undefined);
    try {
      const resolved = await resolveAuthorizationRequest(input, log);
      setRequest(resolved);

      const extracted = extractClaims(resolved);
      setClaims(extracted);
      log('info', 'claims', `${extracted.length} Claims extrahiert`, extracted);

      const cert = await validateCertificates(resolved, certificateMode, log);
      setCertResult(cert);

      applyIdentity(selectedIdentityId, extracted);

      toast.current?.show({
        severity: 'success',
        summary: 'Analyse abgeschlossen',
        detail: `${extracted.length} Felder erkannt`,
        life: 3000,
      });
    } catch (err) {
      log('error', 'parse', 'Analyse fehlgeschlagen', { error: String(err) });
      toast.current?.show({
        severity: 'error',
        summary: 'Fehler',
        detail: String(err),
        life: 5000,
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const handleIdentityChange = (id: string) => {
    setSelectedIdentityId(id);
    applyIdentity(id, claims);
  };

  const handleApprove = async () => {
    if (!request?.response_uri) return;
    setSubmitting(true);
    setLastResult(undefined);

    try {
      const mode = resolveResponseMode(responseMode, request.response_mode);
      const selectedClaims: Record<string, string> = {};
      for (const c of claims) {
        if (claimValues[c.key]) selectedClaims[c.key] = claimValues[c.key];
      }

      const built = await buildResponse(request, selectedClaims, mode);
      log('info', 'build', 'Antwort gebaut', {
        mode: built.mode,
        contentType: built.contentType,
      });

      const result = await sendResponse(request.response_uri, built, log);

      const message = result.ok
        ? `Erfolg: HTTP ${result.status}`
        : result.corsError
          ? 'CORS-Fehler — siehe README'
          : result.error ?? `HTTP ${result.status}`;

      setLastResult({ ok: result.ok, message });
      toast.current?.show({
        severity: result.ok ? 'success' : 'error',
        summary: result.ok ? 'Freigegeben' : 'Fehler',
        detail: message,
        life: 5000,
      });
    } catch (err) {
      const message = String(err);
      setLastResult({ ok: false, message });
      log('error', 'http', message);
    } finally {
      setSubmitting(false);
    }
  };

  const disabledReason = useMemo(() => {
    if (!request) return 'Zuerst eine Anfrage analysieren';
    if (!request.response_uri) return 'response_uri fehlt in der Anfrage';
    if (certResult?.blocksApproval) return 'Zertifikatsprüfung fehlgeschlagen';
    if (claims.length === 0) return 'Keine Claims erkannt';
    return undefined;
  }, [request, certResult, claims]);

  const statusTag = request
    ? certResult?.blocksApproval
      ? { label: 'Blockiert', severity: 'danger' as const }
      : { label: 'Bereit', severity: 'success' as const }
    : { label: 'Warte auf Anfrage', severity: 'secondary' as const };

  return (
    <div className="app-shell">
      <Toast ref={toast} />
      <AppHeader />

      <div className="app-body">
        <div className="app-main">
          <div className="workflow-column">
          <div className="workflow-sticky">
            <div className="flex justify-content-end mb-2">
              <Tag value={statusTag.label} severity={statusTag.severity} />
            </div>
            <WalletSettings
              certificateMode={certificateMode}
              responseMode={responseMode}
              onCertificateModeChange={(m) => {
                setCertificateMode(m);
                if (request) {
                  validateCertificates(request, m, log).then(setCertResult);
                }
              }}
              onResponseModeChange={setResponseMode}
            />
          </div>
          <RequestInput onAnalyze={handleAnalyze} loading={analyzing} />
          <RequestSummary request={request} certMode={certificateMode} certResult={certResult} />
          <IdentityPicker
            claims={claims}
            selectedIdentityId={selectedIdentityId}
            claimValues={claimValues}
            onIdentityChange={handleIdentityChange}
            onClaimChange={(key, value) =>
              setClaimValues((prev) => ({ ...prev, [key]: value }))
            }
          />
          <ActionBar
            onApprove={handleApprove}
            loading={submitting}
            disabled={Boolean(disabledReason)}
            disabledReason={disabledReason}
            lastResult={lastResult}
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

export default function App() {
  return (
    <ActivityLogProvider>
      <AppContent />
    </ActivityLogProvider>
  );
}
