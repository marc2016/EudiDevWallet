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
      <Card title="2. Anfrage-Details" className="mb-2">
        <p className="text-color-secondary text-sm m-0">
          Noch keine Anfrage analysiert.
        </p>
      </Card>
    );
  }

  return (
    <Card title="2. Anfrage-Details" className="mb-2">
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
          <div className="flex align-items-center gap-2 mb-2">
            <span className="font-medium text-sm">Zertifikate</span>
            <Tag
              value={certResult.level === 'success' ? 'OK' : certResult.level === 'warn' ? 'Warnung' : 'Fehler'}
              severity={
                certResult.level === 'success'
                  ? 'success'
                  : certResult.level === 'warn'
                    ? 'warning'
                    : 'danger'
              }
            />
          </div>
          {certResult.messages.map((m, i) => (
            <Message
              key={i}
              severity={
                certResult.level === 'error' ? 'error' : certResult.level === 'warn' ? 'warn' : 'info'
              }
              text={m}
              className="mb-1 w-full"
            />
          ))}
          {certResult.wrpac && (
            <div className="text-sm mt-2">
              <div>Subject: {certResult.wrpac.subject ?? '—'}</div>
              <div>Issuer: {certResult.wrpac.issuer ?? '—'}</div>
            </div>
          )}
        </>
      )}
    </Card>
  );
}
