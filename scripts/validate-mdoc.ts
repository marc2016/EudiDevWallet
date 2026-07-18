import { extractClaims } from '../src/lib/extractClaims';
import { buildMockMdocVpTokenFromRequest } from '../src/lib/buildMockMdoc';

const request = {
  client_id: 'test-client',
  nonce: 'nonce-abc-123456789012',
  response_uri: 'http://localhost:7004/verification-session/x/response',
  dcql_query: {
    credentials: [
      {
        id: 'pid',
        format: 'mso_mdoc',
        claims: [
          { path: ['eu.europa.ec.eudi.pid.1', 'family_name'] },
          { path: ['eu.europa.ec.eudi.pid.1', 'given_name'] },
        ],
      },
    ],
  },
};

const claims = extractClaims(request);
const keys = claims.map((c) => c.key);
if (!keys.includes('family_name') || !keys.includes('given_name')) {
  console.error('FAIL: expected family_name and given_name, got', keys);
  process.exit(1);
}

const vp = await buildMockMdocVpTokenFromRequest(
  request,
  { family_name: 'Mustermann', given_name: 'Max' },
  'eu.europa.ec.eudi.pid.1',
);

if (vp.length < 100) {
  console.error('FAIL: vp_token too short');
  process.exit(1);
}

console.log('OK: claims =', keys.join(', '));
console.log('OK: vp_token length =', vp.length);
