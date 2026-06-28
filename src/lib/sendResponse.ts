import type { BuiltResponse, LogFn, SendResponseResult } from '../types/openid4vp';

export async function sendResponse(
  responseUri: string,
  built: BuiltResponse,
  log?: LogFn,
): Promise<SendResponseResult> {
  const bodyPreview =
    typeof built.body === 'string'
      ? built.body.slice(0, 500)
      : JSON.stringify(built.body).slice(0, 500);

  log?.('info', 'build', 'Antwort wird gesendet', {
    url: responseUri,
    contentType: built.contentType,
    mode: built.mode,
    bodyPreview,
  });

  const start = performance.now();

  try {
    const res = await fetch(responseUri, {
      method: 'POST',
      headers: {
        'Content-Type': built.contentType,
      },
      body: typeof built.body === 'string' ? built.body : JSON.stringify(built.body),
    });

    const duration = Math.round(performance.now() - start);
    let responseBody = '';
    try {
      responseBody = await res.text();
    } catch {
      responseBody = '';
    }

    const result: SendResponseResult = {
      ok: res.ok,
      status: res.status,
      statusText: res.statusText,
      responseBody,
    };

    log?.(res.ok ? 'success' : 'error', 'http', `POST → ${res.status} (${duration}ms)`, {
      url: responseUri,
      status: res.status,
      durationMs: duration,
      requestBody: bodyPreview,
      responseBody: responseBody.slice(0, 1000),
    });

    return result;
  } catch (err) {
    const msg = String(err);
    const corsError =
      msg.includes('Failed to fetch') ||
      msg.includes('NetworkError') ||
      msg.includes('CORS');

    log?.('error', 'http', corsError ? 'CORS- oder Netzwerkfehler' : 'POST fehlgeschlagen', {
      url: responseUri,
      error: msg,
      hint: corsError
        ? 'Hauptanwendung muss Origin http://localhost:5173 in CORS freigeben (siehe README)'
        : undefined,
    });

    return {
      ok: false,
      error: msg,
      corsError,
    };
  }
}
