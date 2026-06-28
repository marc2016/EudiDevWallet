#!/usr/bin/env node
/**
 * Minimal mock verifier for local PocketEudiWallet testing.
 * Usage: node scripts/mock-verifier.mjs
 */
import { createServer } from 'node:http';

const PORT = 3001;

const server = createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', 'http://localhost:5173');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url ?? '/', `http://localhost:${PORT}`);

  if (req.method === 'GET' && url.pathname === '/request') {
    const payload = Buffer.from(
      JSON.stringify({
        client_id: 'mock-verifier',
        response_type: 'vp_token',
        response_mode: 'direct_post',
        response_uri: `http://localhost:${PORT}/callback`,
        nonce: 'mock-nonce-' + Date.now(),
        state: 'mock-state-' + Date.now(),
        presentation_definition: {
          id: 'pd-mock',
          input_descriptors: [
            {
              id: 'pid',
              constraints: {
                fields: [
                  { path: ['$.credentialSubject.given_name'] },
                  { path: ['$.credentialSubject.family_name'] },
                ],
              },
            },
          ],
        },
      }),
    ).toString('base64url');
    const jwt = `eyJhbGciOiJub25lIn0.${payload}.`;
    res.writeHead(200, { 'Content-Type': 'application/oauth-authz-req+jwt' });
    res.end(jwt);
    return;
  }

  if (req.method === 'POST' && url.pathname === '/callback') {
    let body = '';
    for await (const chunk of req) body += chunk;
    console.log('\n--- VP Response received ---');
    console.log('Content-Type:', req.headers['content-type']);
    console.log(body.slice(0, 2000));
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok' }));
    return;
  }

  if (req.method === 'GET' && url.pathname === '/') {
    const requestUri = `http://localhost:${PORT}/request`;
    const link = `openid4vp://?client_id=mock-verifier&request_uri=${encodeURIComponent(requestUri)}`;
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`<h1>Mock Verifier</h1><p>Paste into PocketEudiWallet:</p><textarea rows="4" cols="80">${link}</textarea>`);
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`Mock verifier: http://localhost:${PORT}`);
});
