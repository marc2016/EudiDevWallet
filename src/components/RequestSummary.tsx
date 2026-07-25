import { Card } from 'primereact/card';
import { Divider } from 'primereact/divider';
import { Tag } from 'primereact/tag';
import { Message } from 'primereact/message';
import type { AuthorizationRequest, CertificateValidationResult } from '../types/openid4vp';
import type { CertificateMode } from '../types/openid4vp';

interface RequestSummaryProps {
  request: AuthorizationRequest | null;
  certMode: CertificateMode;
  certResult: CertificateValidationResult | null;
}

function Row({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="flex gap-2 py-1 text-sm">
      <span className="font-medium text-color-secondary" style={{ minWidth: '8rem' }}>
        {label}
      </span>
      <span className="font-mono word-break-all">{value}</span>
    </div>
  );
}

export function RequestSummary({ request, certMode, certResult }: RequestSummaryProps) {
  if (!request) {
    return (
      <Card title="Anfrage-Details" className="mb-2">
        <p className="text-color-secondary text-sm m-0">
          Noch keine Anfrage analysiert.
        </p>
      </Card>
    );
  }

  return (
    <Card title="Anfrage-Details" className="mb-2">
      <Row label="client_id" value={request.client_id} />
      <Row label="response_uri" value={request.response_uri} />
      <Row label="response_mode" value={request.response_mode} />
      <Row label="response_type" value={request.response_type} />
      <Row label="nonce" value={request.nonce} />
      <Row label="state" value={request.state} />
      {request.request_uri && <Row label="request_uri" value={request.request_uri} />}

      {certMode !== 'off' && certResult && (
        <>
          <Divider />
          <div className="flex align-items-center justify-content-between mb-2">
            <span className="font-medium text-sm">Zertifikate & Trust-Validierung</span>
            <Tag
              value={certResult.level === 'success' ? 'GÜLTIG' : certResult.level === 'warn' ? 'WARNUNG' : 'BLOCKIERT'}
              severity={
                certResult.level === 'success'
                  ? 'success'
                  : certResult.level === 'warn'
                    ? 'warning'
                    : 'danger'
              }
            />
          </div>

          <div className="flex flex-wrap gap-2 mb-2">
            {certResult.clientIdMatchValid !== undefined && (
              <Tag
                value={`SAN Match: ${certResult.clientIdMatchValid ? 'OK' : 'Fehler'}`}
                severity={certResult.clientIdMatchValid ? 'success' : certMode === 'strict' ? 'danger' : 'warning'}
              />
            )}
            {certResult.wrprcScopeValid !== undefined && (
              <Tag
                value={`WRPRC Scope: ${certResult.wrprcScopeValid ? 'OK' : 'Fehler'}`}
                severity={certResult.wrprcScopeValid ? 'success' : certMode === 'strict' ? 'danger' : 'warning'}
              />
            )}
            {certResult.trustAnchorValid !== undefined && (
              <Tag
                value={`Trust Anchor: ${certResult.trustAnchorValid ? 'OK' : 'Unbekannt'}`}
                severity={certResult.trustAnchorValid ? 'success' : certMode === 'strict' ? 'danger' : 'warning'}
              />
            )}
            {certResult.signatureValid !== undefined && (
              <Tag
                value={`JWT Signatur: ${certResult.signatureValid ? 'OK' : 'Ungültig'}`}
                severity={certResult.signatureValid ? 'success' : 'danger'}
              />
            )}
          </div>

          {certResult.messages.map((m, i) => {
            const msgSev = m.startsWith('Fehler:')
              ? 'error'
              : m.startsWith('Warnung:')
                ? 'warn'
                : m.includes('erfolgreich') || m.includes('verifiziert') || m.includes('stimmt exakt')
                  ? 'success'
                  : 'info';
            return (
              <Message
                key={i}
                severity={msgSev}
                text={m}
                className="mb-1 w-full"
              />
            );
          })}
          {certResult.wrpac && (
            <div className="text-sm mt-2 p-2 bg-surface-100 border-round">
              <div><strong>Subject:</strong> {certResult.wrpac.subject ?? '—'}</div>
              <div><strong>Issuer:</strong> {certResult.wrpac.issuer ?? '—'}</div>
              {certResult.wrpac.san && certResult.wrpac.san.length > 0 && (
                <div><strong>SANs:</strong> {certResult.wrpac.san.join(', ')}</div>
              )}
            </div>
          )}
        </>
      )}
    </Card>
  );
}
