import type { BuiltResponse, LogFn, SendResponseResult } from '../types/openid4vp';

export async function sendResponse(
  responseUri: string,
  built: BuiltResponse,
  log?: LogFn,
): Promise<SendResponseResult> {
  const fullBody =
    typeof built.body === 'string'
      ? built.body
      : JSON.stringify(built.body);

  const bodyPreview = fullBody.slice(0, 500);

  // Parse form data if urlencoded to extract vp_token for inspection
  let vpTokenDebug = '';
  if (built.contentType === 'application/x-www-form-urlencoded' && typeof built.body === 'string') {
    const params = new URLSearchParams(built.body);
    const vpToken = params.get('vp_token');
    if (vpToken) {
      vpTokenDebug = `vp_token (first 200 chars): ${vpToken.slice(0, 200)}... [length: ${vpToken.length}]`;
    }
  }

  log?.('info', 'build', 'Antwort wird gesendet', {
    url: responseUri,
    contentType: built.contentType,
    mode: built.mode,
    bodyPreview,
    vpTokenDebug,
    fullBodyLength: fullBody.length,
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

    // Extract form parameters for detailed logging
    let formParams: Record<string, string> = {};
    if (built.contentType === 'application/x-www-form-urlencoded' && typeof built.body === 'string') {
      const params = new URLSearchParams(built.body);
      formParams = {
        vp_token_length: String(params.get('vp_token')?.length ?? 0),
        has_presentation_submission: params.has('presentation_submission') ? 'yes' : 'NO',
        has_state: params.has('state') ? 'yes' : 'no',
        presentation_submission: params.get('presentation_submission')?.slice(0, 200) ?? 'MISSING',
      };
    }

    log?.(res.ok ? 'success' : 'error', 'http', `POST → ${res.status} (${duration}ms)`, {
      url: responseUri,
      status: res.status,
      durationMs: duration,
      requestBody: bodyPreview,
      requestBodyLength: fullBody.length,
      formParams,
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
