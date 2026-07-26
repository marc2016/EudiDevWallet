import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { Checkbox } from 'primereact/checkbox';
import { Tag } from 'primereact/tag';
import { Message } from 'primereact/message';
import { Divider } from 'primereact/divider';
import type { AuthorizationRequest, CertificateValidationResult, ExtractedClaim } from '../types/openid4vp';
import { useTranslation } from '../i18n/LanguageContext';

interface SelectiveDisclosureModalProps {
  visible: boolean;
  onHide: () => void;
  onApprove: () => void;
  submitting: boolean;
  request: AuthorizationRequest | null;
  certResult: CertificateValidationResult | null;
  claims: ExtractedClaim[];
  selectedClaims: Record<string, boolean>;
  claimValues: Record<string, string>;
  onToggleClaimSelection: (key: string) => void;
  onSelectAllClaims: () => void;
  onDeselectOptionalClaims: () => void;
}

export function SelectiveDisclosureModal({
  visible,
  onHide,
  onApprove,
  submitting,
  request,
  certResult,
  claims,
  selectedClaims,
  claimValues,
  onToggleClaimSelection,
  onSelectAllClaims,
  onDeselectOptionalClaims,
}: SelectiveDisclosureModalProps) {
  const { t } = useTranslation();
  const essentialClaims = claims.filter((c) => c.essential);
  const optionalClaims = claims.filter((c) => !c.essential);

  const totalDisclosed = claims.filter((c) => selectedClaims[c.key] !== false).length;
  const totalOmitted = claims.length - totalDisclosed;

  const deselectedEssential = essentialClaims.some((c) => selectedClaims[c.key] === false);

  const footer = (
    <div className="flex align-items-center justify-content-between w-full pt-2">
      <div className="text-xs text-color-secondary">
        {totalOmitted > 0 ? (
          <span className="font-semibold text-primary">
            {t('disclosure.retained', {
              count: totalOmitted,
              unit: totalOmitted === 1 ? t('disclosure.unitAttribute') : t('disclosure.unitAttributes'),
            })}
          </span>
        ) : (
          <span>{t('disclosure.fullDisclosure', { count: totalDisclosed })}</span>
        )}
      </div>
      <div className="flex gap-2">
        <Button
          label={t('disclosure.cancel')}
          icon="pi pi-times"
          severity="secondary"
          onClick={onHide}
          disabled={submitting}
        />
        <Button
          label={t('disclosure.approve')}
          icon="pi pi-check"
          severity="success"
          onClick={onApprove}
          loading={submitting}
        />
      </div>
    </div>
  );

  return (
    <Dialog
      header={
        <div className="flex align-items-center gap-2">
          <i className="pi pi-eye text-primary text-xl" />
          <span className="font-semibold">{t('disclosure.title')}</span>
        </div>
      }
      visible={visible}
      modal
      blockScroll
      style={{ width: '90vw', maxWidth: '54rem' }}
      onHide={onHide}
      footer={footer}
      className="p-fluid"
    >
      <div className="flex flex-column gap-3">
        {/* Verifier Header Card */}
        <div className="p-3 surface-100 border-round border-1 surface-border">
          <div className="flex align-items-center justify-content-between mb-1">
            <span className="text-xs font-semibold text-color-secondary uppercase">{t('disclosure.verifier')}</span>
            {certResult && (
              <Tag
                value={certResult.level === 'success' ? 'Zertifikat Gültig' : certResult.level === 'warn' ? 'Zertifikat Warnung' : 'Zertifikat Nicht Verifiziert'}
                severity={certResult.level === 'success' ? 'success' : certResult.level === 'warn' ? 'warning' : 'danger'}
                className="text-xs"
              />
            )}
          </div>
          <div className="font-mono text-sm font-semibold word-break-all">
            {request?.client_id ?? 'Unbekannter Verifier'}
          </div>
          {request?.response_uri && (
            <div className="text-xs text-color-secondary mt-1 word-break-all">
              Callback: {request.response_uri}
            </div>
          )}
        </div>

        {/* Quick Toggles */}
        <div className="flex align-items-center justify-content-between gap-2 py-1">
          <span className="text-xs font-semibold text-color-secondary">{t('disclosure.filterAttributes')}</span>
          <div className="flex gap-2">
            <Button
              label={t('disclosure.deselectOptional')}
              icon="pi pi-filter-slash"
              size="small"
              severity="secondary"
              outlined
              type="button"
              className="text-xs py-1 px-2"
              onClick={onDeselectOptionalClaims}
            />
            <Button
              label={t('disclosure.selectAll')}
              icon="pi pi-check-square"
              size="small"
              severity="secondary"
              outlined
              type="button"
              className="text-xs py-1 px-2"
              onClick={onSelectAllClaims}
            />
          </div>
        </div>

        {/* Essential Warning Banner if deselected */}
        {deselectedEssential && (
          <Message
            severity="warn"
            text="Hinweis: Du hast ein als essenziell markiertes Attribut abgewählt. Der Verifier könnte die Anfrage ablehnen."
            className="w-full justify-content-start text-xs"
          />
        )}

        {/* Essential Claims Section */}
        {essentialClaims.length > 0 && (
          <div>
            <div className="flex align-items-center gap-2 mb-2">
              <Tag value="Essenziell (Erforderlich)" severity="warning" />
              <span className="text-xs text-color-secondary">
                ({essentialClaims.filter((c) => selectedClaims[c.key] !== false).length}/{essentialClaims.length} ausgewählt)
              </span>
            </div>
            <div className="flex flex-column gap-2 surface-0 border-round p-2 border-1 surface-border">
              {essentialClaims.map((c) => {
                const isSelected = selectedClaims[c.key] !== false;
                const value = claimValues[c.key] || '—';
                return (
                  <div
                    key={c.key}
                    className="flex align-items-center justify-content-between p-2 border-round hover:surface-100 transition-colors transition-duration-150"
                  >
                    <div className="flex align-items-center gap-3">
                      <Checkbox
                        checked={isSelected}
                        onChange={() => onToggleClaimSelection(c.key)}
                        id={`modal-essential-${c.key}`}
                      />
                      <label htmlFor={`modal-essential-${c.key}`} className="cursor-pointer">
                        <div className={`text-sm font-semibold ${!isSelected ? 'line-through text-color-secondary' : ''}`}>
                          {c.label}
                        </div>
                        <div className="text-xs text-color-secondary font-mono">{c.key}</div>
                      </label>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-medium">{value}</span>
                      {!isSelected && (
                        <div className="text-xs text-red-500 font-semibold">{t('disclosure.deselected')}</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Optional Claims Section */}
        {optionalClaims.length > 0 && (
          <div>
            <div className="flex align-items-center gap-2 mb-2">
              <Tag value="Optionale Attribute" severity="info" />
              <span className="text-xs text-color-secondary">
                ({optionalClaims.filter((c) => selectedClaims[c.key] !== false).length}/{optionalClaims.length} ausgewählt)
              </span>
            </div>
            <div className="flex flex-column gap-2 surface-0 border-round p-2 border-1 surface-border">
              {optionalClaims.map((c) => {
                const isSelected = selectedClaims[c.key] !== false;
                const value = claimValues[c.key] || '—';
                return (
                  <div
                    key={c.key}
                    className="flex align-items-center justify-content-between p-2 border-round hover:surface-100 transition-colors transition-duration-150"
                    style={{ opacity: isSelected ? 1 : 0.6 }}
                  >
                    <div className="flex align-items-center gap-3">
                      <Checkbox
                        checked={isSelected}
                        onChange={() => onToggleClaimSelection(c.key)}
                        id={`modal-optional-${c.key}`}
                      />
                      <label htmlFor={`modal-optional-${c.key}`} className="cursor-pointer">
                        <div className={`text-sm font-semibold ${!isSelected ? 'line-through' : ''}`}>
                          {c.label}
                        </div>
                        <div className="text-xs text-color-secondary font-mono">{c.key}</div>
                      </label>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-medium">{value}</span>
                      {!isSelected ? (
                        <div className="text-xs text-orange-500 font-semibold">{t('disclosure.suppressed')}</div>
                      ) : (
                        <div className="text-xs text-green-500 font-semibold">{t('disclosure.transmitted')}</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <Divider className="my-1" />

        {/* Disclosure Impact Summary Card */}
        <div className="p-3 surface-200 border-round text-xs flex flex-column gap-1">
          <div className="font-semibold text-sm mb-1 flex align-items-center justify-content-between">
            <span>{t('disclosure.summary')}</span>
            <Tag
              value={totalOmitted > 0 ? 'Selective Disclosure Aktiv' : 'Vollständig'}
              severity={totalOmitted > 0 ? 'success' : 'secondary'}
            />
          </div>
          <div className="flex justify-content-between">
            <span className="text-color-secondary">{t('disclosure.totalRequested')}</span>
            <span className="font-semibold">{claims.length}</span>
          </div>
          <div className="flex justify-content-between">
            <span className="text-color-secondary">{t('disclosure.totalDisclosed')}</span>
            <span className="font-semibold text-green-600">{totalDisclosed}</span>
          </div>
          <div className="flex justify-content-between">
            <span className="text-color-secondary">{t('disclosure.totalOmitted')}</span>
            <span className="font-semibold text-primary">{totalOmitted}</span>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
