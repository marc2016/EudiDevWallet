import { useState } from 'react';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { Steps } from 'primereact/steps';
import { Tag } from 'primereact/tag';
import { ISSUANCE_PRESETS } from '../data/issuancePresets';
import { isCredentialOfferInput, parseCredentialOffer } from '../lib/parseCredentialOffer';
import { simulateIssueCredential } from '../lib/issueCredential';
import type { CredentialOffer, IssuancePreset, IssuedCredentialResult } from '../types/openid4vci';

interface IssuanceWizardModalProps {
  visible: boolean;
  initialOfferInput?: string;
  onHide: () => void;
  onCredentialIssued: (result: IssuedCredentialResult) => void;
  log?: (level: 'info' | 'warn' | 'error' | 'success', category: string, message: string, details?: unknown) => void;
}

export function IssuanceWizardModal({
  visible,
  initialOfferInput = '',
  onHide,
  onCredentialIssued,
  log,
}: IssuanceWizardModalProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [offerInput, setOfferInput] = useState(initialOfferInput);
  const [selectedPreset, setSelectedPreset] = useState<IssuancePreset | null>(ISSUANCE_PRESETS[0]);
  const [parsedOffer, setParsedOffer] = useState<CredentialOffer | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [issuing, setIssuing] = useState(false);
  const [issuedResult, setIssuedResult] = useState<IssuedCredentialResult | null>(null);

  const wizardSteps = [
    { label: 'Issuer & Offer' },
    { label: 'Authentifizierung' },
    { label: 'Vorschau' },
    { label: 'Ausstellung' },
  ];

  const handleSelectPreset = (preset: IssuancePreset) => {
    setSelectedPreset(preset);
    setOfferInput(preset.id);
    setPinInput(preset.defaultPin ?? '');
    setPinError(null);
  };

  const handleNextFromStep1 = () => {
    const rawInput = offerInput.trim() || (selectedPreset ? selectedPreset.id : 'mdl-driving-license');
    if (!isCredentialOfferInput(rawInput) && !selectedPreset) {
      alert('Bitte wähle ein Preset oder gib eine gültige OpenID4VCI Offer-URI / JSON ein.');
      return;
    }
    const offer = parseCredentialOffer(rawInput);
    setParsedOffer(offer);

    const requiresPin =
      offer.grants?.['urn:ietf:params:oauth:grant-type:pre-authorized_code']?.user_pin_required ||
      selectedPreset?.requiresPin;

    if (requiresPin) {
      if (!pinInput && selectedPreset?.defaultPin) {
        setPinInput(selectedPreset.defaultPin);
      }
      setActiveIndex(1); // Go to PIN
    } else {
      setActiveIndex(2); // Skip PIN
    }
  };

  const handleNextFromStep2 = () => {
    const presetPin = selectedPreset?.defaultPin ?? '123456';
    if (selectedPreset?.requiresPin && pinInput !== presetPin) {
      setPinError(`Ungültiger PIN-Code. Für dieses Preset gilt der Test-Code: ${presetPin}`);
      return;
    }
    setPinError(null);
    setActiveIndex(2);
  };

  const handleIssueCredential = async () => {
    if (!parsedOffer) return;
    setIssuing(true);
    log?.('info', 'o4vci', 'Token-Anfrage & Credential Request gesendet', {
      issuer: parsedOffer.credential_issuer,
      credentialTypes: parsedOffer.credential_configuration_ids,
    });

    try {
      const result = await simulateIssueCredential(parsedOffer);
      setIssuedResult(result);
      log?.('success', 'o4vci', `Credential "${result.identity.label}" erfolgreich ausgestellt & empfangen`, {
        format: result.format,
        credentialId: result.credentialId,
        claimsCount: Object.keys(result.identity.claims).length,
      });
      setActiveIndex(3);
    } catch (err) {
      log?.('error', 'o4vci', 'Credential Ausstellung fehlgeschlagen', { error: String(err) });
      alert('Ausstellung fehlgeschlagen: ' + String(err));
    } finally {
      setIssuing(false);
    }
  };

  const handleFinish = () => {
    if (issuedResult) {
      onCredentialIssued(issuedResult);
    }
    handleResetAndHide();
  };

  const handleResetAndHide = () => {
    setActiveIndex(0);
    setOfferInput('');
    setSelectedPreset(ISSUANCE_PRESETS[0]);
    setParsedOffer(null);
    setPinInput('');
    setPinError(null);
    setIssuedResult(null);
    onHide();
  };

  return (
    <Dialog
      header="📥 OpenID4VCI — Credential ausstellen (Issuance Flow)"
      visible={visible}
      style={{ width: '90vw', maxWidth: '720px' }}
      onHide={handleResetAndHide}
      footer={
        <div className="flex justify-content-between w-full mt-3">
          {activeIndex > 0 && activeIndex < 3 && (
            <Button
              label="Zurück"
              icon="pi pi-arrow-left"
              severity="secondary"
              onClick={() => setActiveIndex((prev) => prev - 1)}
              disabled={issuing}
            />
          )}
          <div className="ml-auto flex gap-2">
            {activeIndex === 0 && (
              <Button label="Weiter zur Authentifizierung" icon="pi pi-arrow-right" onClick={handleNextFromStep1} />
            )}
            {activeIndex === 1 && (
              <Button label="PIN Bestätigen" icon="pi pi-check" onClick={handleNextFromStep2} />
            )}
            {activeIndex === 2 && (
              <Button
                label="Credential ausstellen & importieren"
                icon="pi pi-download"
                severity="success"
                onClick={handleIssueCredential}
                loading={issuing}
              />
            )}
            {activeIndex === 3 && (
              <Button label="In Wallet übernehmen" icon="pi pi-check-circle" severity="success" onClick={handleFinish} />
            )}
          </div>
        </div>
      }
    >
      <Steps model={wizardSteps} activeIndex={activeIndex} className="mb-4" />

      {/* STEP 1: Offer Input & Presets */}
      {activeIndex === 0 && (
        <div>
          <h4>1. Credential Offer oder Preset auswählen</h4>
          <p className="text-sm text-color-secondary">
            Wähle ein vorgefertigtes Test-Credential oder füge ein <code>openid-credential-offer://</code> Deep Link / JSON ein:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            {ISSUANCE_PRESETS.map((preset) => {
              const isSelected = selectedPreset?.id === preset.id;
              return (
                <div
                  key={preset.id}
                  onClick={() => handleSelectPreset(preset)}
                  style={{
                    border: isSelected ? '2px solid var(--primary-color, #3b82f6)' : '1px solid var(--surface-border, #cbd5e1)',
                    borderRadius: '8px',
                    padding: '12px',
                    cursor: 'pointer',
                    backgroundColor: isSelected ? 'var(--primary-50, #eff6ff)' : 'transparent',
                  }}
                  className="transition-colors hover:surface-100"
                >
                  <div className="flex items-center gap-2 font-bold mb-1">
                    <i className={preset.icon} />
                    <span>{preset.label}</span>
                  </div>
                  <div className="text-xs text-color-secondary mb-2">{preset.description}</div>
                  <div className="flex gap-2">
                    <Tag value={preset.format} severity={preset.format === 'mso_mdoc' ? 'info' : 'warning'} />
                    {preset.requiresPin && <Tag value="PIN erforderlich" severity="danger" icon="pi pi-lock" />}
                  </div>
                </div>
              );
            })}
          </div>

          <label className="block text-sm font-semibold mb-1">Oder manuelles Credential Offer (URI / JSON):</label>
          <InputTextarea
            value={offerInput}
            onChange={(e) => {
              setOfferInput(e.target.value);
              setSelectedPreset(null);
            }}
            rows={3}
            className="w-full font-mono text-xs mb-2"
            placeholder="openid-credential-offer://?credential_offer=..."
          />
        </div>
      )}

      {/* STEP 2: PIN / TxCode Input */}
      {activeIndex === 1 && (
        <div>
          <h4>2. Pre-Authorized Code & User PIN (TxCode)</h4>
          <p className="text-sm text-color-secondary">
            Der Issuer {parsedOffer?.credential_issuer} verlangt eine Benutzer-PIN zur Autorisierung des Abrufs.
          </p>

          <div className="p-3 border-round surface-100 mb-3">
            <div className="text-xs text-color-secondary">Geforderte Authentifizierung:</div>
            <div className="font-semibold text-sm">6-stelliger eID / Pre-authorized TxCode</div>
            {selectedPreset?.defaultPin && (
              <div className="text-xs text-blue-600 mt-1">
                💡 Test-PIN für dieses Preset: <strong>{selectedPreset.defaultPin}</strong>
              </div>
            )}
          </div>

          <label className="block text-sm font-semibold mb-1">Eingabe PIN / TxCode:</label>
          <InputText
            value={pinInput}
            onChange={(e) => setPinInput(e.target.value)}
            maxLength={6}
            className="w-full text-center text-xl font-mono tracking-widest mb-2"
            placeholder="123456"
          />

          {pinError && <div className="text-red-500 text-sm font-semibold mb-2">{pinError}</div>}
        </div>
      )}

      {/* STEP 3: Preview */}
      {activeIndex === 2 && (
        <div>
          <h4>3. Credential Vorschau & Details</h4>
          <div className="p-3 border-round surface-100 mb-3">
            <div className="flex justify-between items-center mb-2">
              <span className="font-bold">{selectedPreset?.label ?? parsedOffer?.display_name}</span>
              <Tag value={selectedPreset?.format ?? 'vc+sd-jwt'} severity="info" />
            </div>
            <div className="text-xs text-color-secondary mb-2">
              Issuer: <code>{parsedOffer?.credential_issuer}</code>
            </div>
            <div className="text-xs font-semibold mb-1">Enthaltene Attribute (Claims):</div>
            <div className="max-h-40 overflow-y-auto font-mono text-xs surface-card p-2 border-round">
              {Object.entries(selectedPreset?.claims ?? { given_name: 'Max', family_name: 'Mustermann' }).map(
                ([k, v]) => (
                  <div key={k} className="flex justify-between py-1 border-bottom-1 surface-border">
                    <span className="text-color-secondary">{k}:</span>
                    <span className="font-bold">{v}</span>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      )}

      {/* STEP 4: Success */}
      {activeIndex === 3 && issuedResult && (
        <div className="text-center py-4">
          <i className="pi pi-check-circle text-green-500 text-6xl mb-3" />
          <h3>Credential erfolgreich empfangen!</h3>
          <p className="text-sm text-color-secondary mb-4">
            Das Credential <strong>{issuedResult.identity.label}</strong> wurde verschlüsselt in deiner Wallet gespeichert.
          </p>
          <div className="surface-100 p-3 border-round text-left font-mono text-xs max-w-md mx-auto">
            <div><strong>Credential ID:</strong> {issuedResult.credentialId}</div>
            <div><strong>Format:</strong> {issuedResult.format}</div>
            <div><strong>Ausstellungsdatum:</strong> {new Date(issuedResult.issuedAt).toLocaleString()}</div>
          </div>
        </div>
      )}
    </Dialog>
  );
}
