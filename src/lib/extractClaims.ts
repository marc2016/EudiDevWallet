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

function isClaimEssential(
  explicitEssential?: boolean,
  explicitOptional?: boolean,
  key?: string
): boolean {
  if (explicitEssential !== undefined) return explicitEssential;
  if (explicitOptional !== undefined) return !explicitOptional;
  // Default heuristic for PID/EAA claims when request does not explicitly specify
  const essentialKeys = new Set([
    'given_name',
    'family_name',
    'birth_date',
    'birthdate',
    'age_over_18',
    'age_over_21',
    'employee_id',
    'degree_name',
    'company_name'
  ]);
  return key ? essentialKeys.has(key) : false;
}

export function extractClaims(request: AuthorizationRequest): ExtractedClaim[] {
  const claims: ExtractedClaim[] = [];
  const seen = new Set<string>();

  const add = (key: string, path: string, essential: boolean) => {
    if (!key || seen.has(key)) return;
    seen.add(key);
    claims.push({ key, path, label: claimLabel(key), essential });
  };

  if (request.presentation_definition?.input_descriptors) {
    for (const desc of request.presentation_definition.input_descriptors) {
      for (const field of desc.constraints?.fields ?? []) {
        const key = claimKeyFromPath(field.path);
        const essential = isClaimEssential(field.essential, field.optional, key);
        add(key, pathLabel(field.path, key), essential);
      }
    }
  }

  if (request.dcql_query?.credentials) {
    for (const cred of request.dcql_query.credentials) {
      for (const c of cred.claims ?? []) {
        const key = claimKeyFromPath(c.path) || c.id || '';
        const essential = isClaimEssential(c.essential, c.optional, key);
        add(key, pathLabel(c.path, key), essential);
      }
    }
  }

  if (claims.length === 0) {
    for (const key of ['given_name', 'family_name', 'birth_date']) {
      const essential = isClaimEssential(undefined, undefined, key);
      add(key, `$.credentialSubject.${key}`, essential);
    }
  }

  return claims;
}
