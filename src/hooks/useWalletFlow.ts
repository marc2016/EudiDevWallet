import { useCallback, useMemo, useState } from 'react';
import { useActivityLog } from '../log/ActivityLogContext';
import { mockClaimValue } from '../log/activityLog';
import { resolveAuthorizationRequest } from '../lib/fetchRequestObject';
import { extractClaims } from '../lib/extractClaims';
import { validateCertificates } from '../lib/validateCertificates';
import { buildResponse } from '../lib/buildResponse';
import { sendResponse } from '../lib/sendResponse';
import { formatVerifierError } from '../lib/formatVerifierError';
import { resolveCredentialFormat } from '../lib/resolveCredentialFormat';
import {
  loadCertificateMode,
  loadClearLogOnRequest,
  loadCredentialFormat,
  loadCustomTrustAnchors,
  loadResponseMode,
  loadSimulateOneTimeUse,
  loadTrustAnchorMode,
  resolveResponseMode,
  saveCertificateMode,
  saveCredentialFormat,
  saveCustomTrustAnchors,
  saveResponseMode,
  saveSimulateOneTimeUse,
  saveTrustAnchorMode,
} from '../settings/walletSettings';
import { addCustomIdentity, getAllIdentities } from '../data/mockIdentities';
import { isCredentialOfferInput, resolveCredentialOfferAsync } from '../lib/parseCredentialOffer';
import { sendCredentialNotification, simulateIssueCredential } from '../lib/issueCredential';
import type { CredentialOffer, IssuedCredentialResult } from '../types/openid4vci';
import type {
  AuthorizationRequest,
  CertificateMode,
  CertificateValidationResult,
  CredentialFormatSetting,
  ExtractedClaim,
  MockIdentity,
  ResponseMode,
  TrustAnchorMode,
} from '../types/openid4vp';

function decodeBase64Url(str: string): Record<string, unknown> | null {
  try {
    const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
    const jsonStr = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonStr) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export interface WalletFlowOptions {}

export function useWalletFlow() {
  const { log, clear } = useActivityLog();
  const anyLog = log as any;

  const [identities, setIdentities] = useState<MockIdentity[]>(getAllIdentities);
  const [certificateMode, setCertificateModeState] = useState<CertificateMode>(loadCertificateMode);
  const [trustAnchorMode, setTrustAnchorModeState] = useState<TrustAnchorMode>(loadTrustAnchorMode);
  const [customTrustAnchors, setCustomTrustAnchorsState] = useState<string>(loadCustomTrustAnchors);
  const [responseMode, setResponseModeState] = useState<ResponseMode>(loadResponseMode);
  const [credentialFormat, setCredentialFormatState] =
    useState<CredentialFormatSetting>(loadCredentialFormat);
  const [simulateOneTimeUse, setSimulateOneTimeUseState] = useState<boolean>(loadSimulateOneTimeUse);
  const [remainingCredentials, setRemainingCredentials] = useState<number>(5);
  const [request, setRequest] = useState<AuthorizationRequest | null>(null);
  const [claims, setClaims] = useState<ExtractedClaim[]>([]);
  const [selectedClaims, setSelectedClaims] = useState<Record<string, boolean>>({});
  const [certResult, setCertResult] = useState<CertificateValidationResult | null>(null);
  const [selectedIdentityId, setSelectedIdentityId] = useState(identities[0]?.id ?? 'max-mustermann');
  const [claimValues, setClaimValues] = useState<Record<string, string>>({});
  const [analyzing, setAnalyzing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [lastResult, setLastResult] = useState<{ ok: boolean; message: string } | undefined>();
  const [lastError, setLastError] = useState<string | undefined>();

  // OpenID4VCI inline state
  const [issuanceOffer, setIssuanceOffer] = useState<CredentialOffer | null>(null);
  const [issuedCredentialResult, setIssuedCredentialResult] = useState<IssuedCredentialResult | null>(null);
  const [issuancePinInput, setIssuancePinInput] = useState<string>('');
  const [issuancePinError, setIssuancePinError] = useState<string | null>(null);

  const applyIdentity = useCallback(
    (id: string, extracted: ExtractedClaim[]) => {
      const identity = identities.find((m) => m.id === id) ?? identities[0];
      const values: Record<string, string> = {};
      if (identity) {
        for (const c of extracted) {
          values[c.key] = mockClaimValue(identity.claims, c.key);
        }
      }
      console.log('[useWalletFlow] applyIdentity setClaimValues:', values);
      setClaimValues(values);
    },
    [identities]
  );

  const showToast = useCallback((_severity: any, _summary: any, _detail: any) => {}, []);

  const handleIssueCredential = async (pinOverride?: string): Promise<boolean> => {
    if (!issuanceOffer) return false;
    const pin = pinOverride ?? issuancePinInput;

    const requiresPin =
      issuanceOffer.grants?.['urn:ietf:params:oauth:grant-type:pre-authorized_code']?.user_pin_required;

    if (requiresPin && !pin) {
      setIssuancePinError('Bitte 6-stelligen PIN-Code eingeben');
      return false;
    }

    setSubmitting(true);
    setIssuancePinError(null);
    log('info', 'o4vci', 'Token Endpoint Call & DPoP Key Binding gestartet', {
      issuer: issuanceOffer.credential_issuer,
      credentialTypes: issuanceOffer.credential_configuration_ids,
    });

    try {
      const result = await simulateIssueCredential(
        issuanceOffer,
        undefined,
        pin || undefined,
        anyLog
      );
      const updatedIdentities = addCustomIdentity(result.identity);
      setIdentities(updatedIdentities);
      setSelectedIdentityId(result.identity.id);
      setIssuedCredentialResult(result);

      log('success', 'o4vci', `Credential "${result.identity.label}" erfolgreich ausgestellt & in Wallet gespeichert`, {
        credentialId: result.credentialId,
        format: result.format,
      });

      if (result.notification) {
        const endpoint = issuanceOffer.notification_endpoint ?? `${issuanceOffer.credential_issuer}/notification`;
        await sendCredentialNotification(endpoint, result.notification, log, result.accessToken);
      }

      showToast(
        'success',
        'Credential ausgestellt',
        `"${result.identity.label}" wurde in der Wallet gespeichert.`
      );
      return true;
    } catch (err) {
      const msg = String(err);
      setLastError(msg);
      log('error', 'o4vci', 'Credential Ausstellung fehlgeschlagen', { error: msg });
      showToast('error', 'Fehler bei Ausstellung', msg);
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  const handleAnalyze = async (input: string): Promise<boolean> => {
    setAnalyzing(true);
    setLastResult(undefined);
    setLastError(undefined);
    setIssuanceOffer(null);
    setIssuedCredentialResult(null);
    setIssuancePinInput('');
    setIssuancePinError(null);

    try {
      if (loadClearLogOnRequest()) {
        clear();
      }

      // Check if OpenID4VCI Issuance input
      if (isCredentialOfferInput(input)) {
        const offer = await resolveCredentialOfferAsync(input, anyLog);
        setIssuanceOffer(offer);
        setRequest(null);
        setClaims([]);
        setCertResult(null);

        // Pre-fill pin if preset default available
        const defaultPin = offer.grants?.['urn:ietf:params:oauth:grant-type:pre-authorized_code']?.tx_code?.description?.match(/\d{6}/)?.[0] ?? '123456';
        setIssuancePinInput(defaultPin);

        log('info', 'o4vci', `OpenID4VCI Credential Offer analysiert: ${offer.display_name || offer.credential_issuer}`, {
          issuer: offer.credential_issuer,
          credentials: offer.credential_configuration_ids,
        });

        showToast('success', 'Credential Offer erkannt', offer.display_name || offer.credential_issuer);
        return true;
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

      const cert = await validateCertificates(resolved, certificateMode, trustAnchorMode, customTrustAnchors, log);
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
    const identity = identities.find((m) => m.id === id) ?? identities[0];
    if (identity) {
      log('info', 'claims', `Identität zu "${identity.label}" gewechselt. Werte werden aktualisiert.`, {
        identityId: id,
        claimsCount: claims.length,
      });
    }
    applyIdentity(id, claims);
  };

  const toggleClaimSelection = useCallback((key: string) => {
    setSelectedClaims((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  }, []);

  const selectAllClaims = useCallback(() => {
    const next: Record<string, boolean> = {};
    for (const c of claims) {
      next[c.key] = true;
    }
    setSelectedClaims(next);
  }, [claims]);

  const deselectOptionalClaims = useCallback(() => {
    const next: Record<string, boolean> = {};
    for (const c of claims) {
      next[c.key] = c.essential ?? false;
    }
    setSelectedClaims(next);
  }, [claims]);

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

      const decodedDetails: Record<string, unknown> = {
        mode: built.mode,
        contentType: built.contentType,
        credentialFormat: vpFormat,
      };

      if (mode === 'raw_json') {
        decodedDetails.body = built.body;
      } else if (mode === 'direct_post_jwt') {
        const params = new URLSearchParams(built.body as string);
        const jwe = params.get('response') ?? '';
        decodedDetails.encryptedResponseJWE = jwe;

        try {
          if (vpFormat === 'dc+sd-jwt') {
            const vpTokenPlain = await buildResponse(request, selectedClaimsData, 'direct_post', vpFormat);
            const directPostParams = new URLSearchParams(vpTokenPlain.body as string);
            const plainVpToken = directPostParams.get('vp_token') ?? '';

            const parts = plainVpToken.split('~');
            const issuerPayload = parts[0] ? decodeBase64Url(parts[0].split('.')[1] ?? '') : null;
            const kbPayload = parts[1] ? decodeBase64Url(parts[1].split('.')[1] ?? '') : null;

            decodedDetails.unencryptedPayload = {
              state: request.state ?? '',
              vp_token: {
                [request.dcql_query?.credentials?.[0]?.id ?? 'credential']: [
                  {
                    issuerJwt: issuerPayload,
                    keyBindingJwt: kbPayload,
                    rawVpToken: plainVpToken,
                  },
                ],
              },
            };
          } else {
            const vpTokenPlain = await buildResponse(request, selectedClaimsData, 'direct_post', vpFormat);
            const directPostParams = new URLSearchParams(vpTokenPlain.body as string);
            const plainVpToken = directPostParams.get('vp_token') ?? '';
            decodedDetails.unencryptedPayload = {
              state: request.state ?? '',
              vp_token: {
                [request.dcql_query?.credentials?.[0]?.id ?? 'credential']: [plainVpToken],
              },
            };
          }
        } catch (e) {
          // ignore fallback
        }
      } else {
        const params = new URLSearchParams(built.body as string);
        const vpToken = params.get('vp_token') ?? '';
        const submission = params.get('presentation_submission') ?? '';

        try {
          decodedDetails.presentationSubmission = JSON.parse(submission);
        } catch {
          decodedDetails.presentationSubmission = submission;
        }

        if (vpFormat === 'dc+sd-jwt') {
          const parts = vpToken.split('~');
          const issuerPayload = parts[0] ? decodeBase64Url(parts[0].split('.')[1] ?? '') : null;
          const kbPayload = parts[1] ? decodeBase64Url(parts[1].split('.')[1] ?? '') : null;
          decodedDetails.vpTokenDecoded = {
            issuerJwt: issuerPayload,
            keyBindingJwt: kbPayload,
          };
        } else {
          decodedDetails.vpTokenBase64Url = vpToken;
        }
      }

      log('info', 'build', 'Antwort gebaut', decodedDetails);

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
      validateCertificates(request, mode, trustAnchorMode, customTrustAnchors, log).then(setCertResult);
    }
  };

  const setTrustAnchorMode = (mode: TrustAnchorMode) => {
    setTrustAnchorModeState(mode);
    saveTrustAnchorMode(mode);
    if (request) {
      validateCertificates(request, certificateMode, mode, customTrustAnchors, log).then(setCertResult);
    }
  };

  const setCustomTrustAnchors = (anchors: string) => {
    setCustomTrustAnchorsState(anchors);
    saveCustomTrustAnchors(anchors);
    if (request) {
      validateCertificates(request, certificateMode, trustAnchorMode, anchors, log).then(setCertResult);
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
    setIssuanceOffer(null);
    setIssuedCredentialResult(null);
    setIssuancePinInput('');
    setIssuancePinError(null);
    setSelectedIdentityId(identities[0]?.id ?? 'max-mustermann');
  };

  const disabledReason = useMemo(() => {
    if (issuanceOffer) return undefined;
    if (!request) return 'Zuerst eine Anfrage analysieren';
    if (!request.response_uri) return 'response_uri fehlt in der Anfrage';
    if (certResult?.blocksApproval) return 'Zertifikatsprüfung fehlgeschlagen';
    if (claims.length === 0) return 'Keine Claims erkannt';
    return undefined;
  }, [request, certResult, claims, issuanceOffer]);

  return {
    identities,
    certificateMode,
    trustAnchorMode,
    customTrustAnchors,
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
    issuanceOffer,
    issuedCredentialResult,
    issuancePinInput,
    issuancePinError,
    isIssuanceFlow: Boolean(issuanceOffer),
    setIssuancePinInput,
    handleIssueCredential,
    handleAnalyze,
    handleIdentityChange,
    toggleClaimSelection,
    selectAllClaims,
    deselectOptionalClaims,
    handleApprove,
    setCertificateMode,
    setTrustAnchorMode,
    setCustomTrustAnchors,
    setResponseMode,
    setCredentialFormat,
    setSimulateOneTimeUse,
    setClaimValues,
    resetFlow,
  };
}

