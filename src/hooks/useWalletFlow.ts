import { useCallback, useMemo, useState, type RefObject } from 'react';
import type { Toast } from 'primereact/toast';
import { useActivityLog } from '../log/ActivityLogContext';
import { mockClaimValue } from '../log/activityLog';
import { resolveAuthorizationRequest } from '../lib/fetchRequestObject';
import { extractClaims } from '../lib/extractClaims';
import { validateCertificates } from '../lib/validateCertificates';
import { buildResponse } from '../lib/buildResponse';
import { sendResponse } from '../lib/sendResponse';
import { formatVerifierError } from '../lib/formatVerifierError';
import {
  loadCertificateMode,
  loadClearLogOnRequest,
  loadCredentialFormat,
  loadResponseMode,
  loadSimulateOneTimeUse,
  resolveResponseMode,
  saveCertificateMode,
  saveCredentialFormat,
  saveResponseMode,
  saveSimulateOneTimeUse,
} from '../settings/walletSettings';
import { resolveCredentialFormat } from '../lib/resolveCredentialFormat';
import { mockIdentities } from '../data/mockIdentities';
import type {
  AuthorizationRequest,
  CertificateMode,
  CertificateValidationResult,
  CredentialFormatSetting,
  ExtractedClaim,
  ResponseMode,
} from '../types/openid4vp';

export type ToastMode = 'all' | 'errors-only' | 'none';

interface UseWalletFlowOptions {
  toast?: RefObject<Toast | null>;
  toastMode?: ToastMode;
}

export function useWalletFlow(options: UseWalletFlowOptions = {}) {
  const { toast, toastMode = 'all' } = options;
  const { log, clear } = useActivityLog();

  const [certificateMode, setCertificateModeState] = useState<CertificateMode>(loadCertificateMode);
  const [responseMode, setResponseModeState] = useState<ResponseMode>(loadResponseMode);
  const [credentialFormat, setCredentialFormatState] =
    useState<CredentialFormatSetting>(loadCredentialFormat);
  const [simulateOneTimeUse, setSimulateOneTimeUseState] = useState<boolean>(loadSimulateOneTimeUse);
  const [remainingCredentials, setRemainingCredentials] = useState<number>(5);
  const [request, setRequest] = useState<AuthorizationRequest | null>(null);
  const [claims, setClaims] = useState<ExtractedClaim[]>([]);
  const [selectedClaims, setSelectedClaims] = useState<Record<string, boolean>>({});
  const [certResult, setCertResult] = useState<CertificateValidationResult | null>(null);
  const [selectedIdentityId, setSelectedIdentityId] = useState(mockIdentities[0].id);
  const [claimValues, setClaimValues] = useState<Record<string, string>>({});
  const [analyzing, setAnalyzing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [lastResult, setLastResult] = useState<{ ok: boolean; message: string } | undefined>();
  const [lastError, setLastError] = useState<string | undefined>();

  const applyIdentity = useCallback((id: string, extracted: ExtractedClaim[]) => {
    const identity = mockIdentities.find((m) => m.id === id) ?? mockIdentities[0];
    const values: Record<string, string> = {};
    for (const c of extracted) {
      values[c.key] = mockClaimValue(identity.claims, c.key);
    }
    setClaimValues(values);
  }, []);

  const showToast = useCallback(
    (severity: 'success' | 'error', summary: string, detail: string) => {
      if (toastMode === 'none') return;
      if (toastMode === 'errors-only' && severity === 'success') return;
      toast?.current?.show({ severity, summary, detail, life: severity === 'success' ? 3000 : 5000 });
    },
    [toast, toastMode],
  );

  const handleAnalyze = async (input: string): Promise<boolean> => {
    setAnalyzing(true);
    setLastResult(undefined);
    setLastError(undefined);
    try {
      if (loadClearLogOnRequest()) {
        clear();
      }
      const resolved = await resolveAuthorizationRequest(input, log);
      setRequest(resolved);

      const extracted = extractClaims(resolved);
      setClaims(extracted);
      log('info', 'claims', `${extracted.length} Claims extrahiert`, extracted);

      const initialSelected: Record<string, boolean> = {};
      for (const c of extracted) {
        initialSelected[c.key] = true;
      }
      setSelectedClaims(initialSelected);

      const cert = await validateCertificates(resolved, certificateMode, log);
      setCertResult(cert);

      applyIdentity(selectedIdentityId, extracted);

      showToast('success', 'Analyse abgeschlossen', `${extracted.length} Felder erkannt`);
      return true;
    } catch (err) {
      const message = String(err);
      setLastError(message);
      log('error', 'parse', 'Analyse fehlgeschlagen', { error: message });
      showToast('error', 'Fehler', message);
      return false;
    } finally {
      setAnalyzing(false);
    }
  };

  const handleIdentityChange = (id: string) => {
    setSelectedIdentityId(id);
    applyIdentity(id, claims);
  };

  const toggleClaimSelection = useCallback((key: string) => {
    setSelectedClaims((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  }, []);

  const handleApprove = async (): Promise<boolean> => {
    if (!request?.response_uri) return false;
    setSubmitting(true);
    setLastResult(undefined);
    setLastError(undefined);

    try {
      const mode = resolveResponseMode(responseMode, request.response_mode);
      const vpFormat = resolveCredentialFormat(credentialFormat, request);
      const selectedClaimsData: Record<string, string> = {};
      for (const c of claims) {
        if (claimValues[c.key] && selectedClaims[c.key] !== false) {
          selectedClaimsData[c.key] = claimValues[c.key];
        }
      }

      const built = await buildResponse(request, selectedClaimsData, mode, vpFormat);
      log('info', 'build', 'Antwort gebaut', {
        mode: built.mode,
        contentType: built.contentType,
        credentialFormat: vpFormat,
      });

      const result = await sendResponse(request.response_uri, built, log);

      const message = result.ok
        ? `Erfolg: HTTP ${result.status}`
        : result.corsError
          ? 'CORS-Fehler — siehe README'
          : result.error ??
            formatVerifierError(result.status, result.responseBody, request.response_uri);

      setLastResult({ ok: result.ok, message });
      showToast(result.ok ? 'success' : 'error', result.ok ? 'Freigegeben' : 'Fehler', message);
      if (!result.ok) setLastError(message);

      if (result.ok && simulateOneTimeUse) {
        setRemainingCredentials((prev) => {
          const nextVal = prev - 1;
          log('info', 'claims', `PID-Credential verbraucht und gelöscht (Unlinkability). Verbleibende Credentials im Batch: ${nextVal}/5.`);
          
          if (nextVal <= 1) {
            log('info', 'fetch', 'Automatischer Batch-Refresh gestartet (Zähler <= 1). DPoP-Proof wird erzeugt...');
            setTimeout(() => {
              log('info', 'fetch', 'pp_refresh_token an Credentials-Endpoint gesendet.');
              setTimeout(() => {
                log('success', 'fetch', 'Neuer Batch mit 5 PID-Credentials erfolgreich empfangen.');
                setRemainingCredentials(5);
                showToast('success', 'Batch erneuert', '5 neue PID-Credentials erhalten.');
              }, 800);
            }, 800);
          }
          return nextVal;
        });
      }

      return result.ok;
    } catch (err) {
      const message = String(err);
      setLastResult({ ok: false, message });
      setLastError(message);
      log('error', 'http', message);
      showToast('error', 'Fehler', message);
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  const setCertificateMode = (mode: CertificateMode) => {
    setCertificateModeState(mode);
    saveCertificateMode(mode);
    if (request) {
      validateCertificates(request, mode, log).then(setCertResult);
    }
  };

  const setResponseMode = (mode: ResponseMode) => {
    setResponseModeState(mode);
    saveResponseMode(mode);
  };

  const setCredentialFormat = (format: CredentialFormatSetting) => {
    setCredentialFormatState(format);
    saveCredentialFormat(format);
  };

  const setSimulateOneTimeUse = (val: boolean) => {
    setSimulateOneTimeUseState(val);
    saveSimulateOneTimeUse(val);
  };

  const resetFlow = () => {
    setRequest(null);
    setClaims([]);
    setCertResult(null);
    setClaimValues({});
    setSelectedClaims({});
    setLastResult(undefined);
    setLastError(undefined);
    setSelectedIdentityId(mockIdentities[0].id);
  };

  const disabledReason = useMemo(() => {
    if (!request) return 'Zuerst eine Anfrage analysieren';
    if (!request.response_uri) return 'response_uri fehlt in der Anfrage';
    if (certResult?.blocksApproval) return 'Zertifikatsprüfung fehlgeschlagen';
    if (claims.length === 0) return 'Keine Claims erkannt';
    return undefined;
  }, [request, certResult, claims]);

  return {
    certificateMode,
    responseMode,
    credentialFormat,
    simulateOneTimeUse,
    remainingCredentials,
    request,
    claims,
    selectedClaims,
    certResult,
    selectedIdentityId,
    claimValues,
    analyzing,
    submitting,
    lastResult,
    lastError,
    disabledReason,
    handleAnalyze,
    handleIdentityChange,
    toggleClaimSelection,
    handleApprove,
    setCertificateMode,
    setResponseMode,
    setCredentialFormat,
    setSimulateOneTimeUse,
    setClaimValues,
    resetFlow,
  };
}
