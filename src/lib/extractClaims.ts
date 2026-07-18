import { claimLabel } from '../log/activityLog';
import type { AuthorizationRequest, ExtractedClaim } from '../types/openid4vp';

function claimKeyFromPath(path: string[] | undefined): string {
  if (!path?.length) return '';
  const first = path[0];

  const jsonPointer = first.match(/\$\.(?:credentialSubject\.)?(.+)$/);
  if (jsonPointer) return jsonPointer[1];
  if (first.startsWith('$.')) return first.replace(/^\$\./, '');

  // DCQL mdoc paths: [namespace, elementId, ...]
  if (path.length >= 2) return path[path.length - 1];

  return first;
}

function pathLabel(path: string[] | undefined, key: string): string {
  if (!path?.length) return key;
  if (path.length >= 2 && !path[0].startsWith('$')) return path.join(' / ');
  return path[0] ?? key;
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
        const key = claimKeyFromPath(field.path);
        add(key, pathLabel(field.path, key));
      }
    }
  }

  if (request.dcql_query?.credentials) {
    for (const cred of request.dcql_query.credentials) {
      for (const c of cred.claims ?? []) {
        const key = claimKeyFromPath(c.path) || c.id || '';
        add(key, pathLabel(c.path, key));
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
