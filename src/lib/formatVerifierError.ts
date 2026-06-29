export function formatVerifierError(
  status?: number,
  responseBody?: string,
  responseUri?: string,
): string {
  const raw = extractErrorMessage(responseBody);
  const isEudiplo = responseUri?.includes('eudiplo.eudi-wallet.org') ?? false;

  if (raw.includes('Invalid JWT Signature') || raw.includes('Invalid JWT as input')) {
    if (isEudiplo) {
      return (
        `HTTP ${status ?? 400}: Der EUDI-Playground lehnt Mock-Credentials ab. ` +
        'Protokoll und Verschlüsselung sind korrekt — für eine erfolgreiche Präsentation braucht es echte PID-Credentials von einem vertrauenswürdigen Issuer. ' +
        'Lokaler Test: npm run mock-verifier'
      );
    }
    return (
      `HTTP ${status ?? 400}: Credential-Signatur vom Verifier abgelehnt. ` +
      'Mock-Credentials sind nicht in der Trust List des Verifiers.'
    );
  }

  if (raw.includes('Invalid Compact JWE')) {
    return `HTTP ${status ?? 400}: Antwort-Verschlüsselung wurde vom Verifier abgelehnt.`;
  }

  if (raw) return `HTTP ${status ?? '?'}: ${raw}`;
  return `HTTP ${status ?? '?'}`;
}

function extractErrorMessage(responseBody?: string): string {
  if (!responseBody) return '';
  try {
    const json = JSON.parse(responseBody) as {
      message?: string | { message?: string };
    };
    if (typeof json.message === 'string') return json.message;
    if (json.message && typeof json.message === 'object' && json.message.message) {
      return json.message.message;
    }
  } catch {
    return responseBody.slice(0, 200);
  }
  return '';
}
