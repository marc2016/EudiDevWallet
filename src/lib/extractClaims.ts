import { claimLabel } from '../log/activityLog';
import type { AuthorizationRequest, ExtractedClaim } from '../types/openid4vp';

function pathFromJsonPointer(paths: string[] | undefined): string {
  if (!paths?.length) return '';
  const p = paths[0];
  const match = p.match(/\$\.(?:credentialSubject\.)?(.+)$/);
  return match ? match[1] : p.replace(/^\$\./, '');
}

export function extractClaims(request: AuthorizationRequest): ExtractedClaim[] {
  const claims: ExtractedClaim[] = [];
  const seen = new Set<string>();

  const add = (key: string, path: string) => {
    if (!key || seen.has(key)) return;
    seen.add(key);
    claims.push({ key, path, label: claimLabel(key) });
  };

  if (request.presentation_definition?.input_descriptors) {
    for (const desc of request.presentation_definition.input_descriptors) {
      for (const field of desc.constraints?.fields ?? []) {
        const key = pathFromJsonPointer(field.path);
        add(key, field.path?.[0] ?? key);
      }
    }
  }

  if (request.dcql_query?.credentials) {
    for (const cred of request.dcql_query.credentials) {
      for (const c of cred.claims ?? []) {
        const key = pathFromJsonPointer(c.path) || c.id || '';
        add(key, c.path?.[0] ?? key);
      }
    }
  }

  if (claims.length === 0) {
    for (const key of ['given_name', 'family_name', 'birth_date']) {
      add(key, `$.credentialSubject.${key}`);
    }
  }

  return claims;
}
