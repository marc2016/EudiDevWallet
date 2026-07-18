import type {
  AuthorizationRequest,
  CredentialFormatSetting,
  VpCredentialFormat,
} from '../types/openid4vp';

export function detectCredentialFormatFromRequest(
  request?: AuthorizationRequest | null,
): VpCredentialFormat | undefined {
  if (!request) return undefined;

  const dcqlFormat = request.dcql_query?.credentials?.[0]?.format;
  if (dcqlFormat === 'mso_mdoc') return 'mso_mdoc';
  if (dcqlFormat === 'dc+sd-jwt' || dcqlFormat === 'vc+sd-jwt') return 'dc+sd-jwt';

  for (const desc of request.presentation_definition?.input_descriptors ?? []) {
    const format = desc.format;
    if (format && typeof format === 'object') {
      if ('mso_mdoc' in format) return 'mso_mdoc';
      if ('dc+sd-jwt' in format || 'vc+sd-jwt' in format) return 'dc+sd-jwt';
    }
  }

  return undefined;
}

export function resolveCredentialFormat(
  setting: CredentialFormatSetting,
  request?: AuthorizationRequest | null,
): VpCredentialFormat {
  if (setting === 'dc_sd_jwt') return 'dc+sd-jwt';
  if (setting === 'mso_mdoc') return 'mso_mdoc';
  return detectCredentialFormatFromRequest(request) ?? 'dc+sd-jwt';
}

export function resolveDoctype(request?: AuthorizationRequest | null): string {
  const fromDcql = request?.dcql_query?.credentials?.[0]?.meta?.doctype_value?.[0];
  if (fromDcql) return fromDcql;

  for (const desc of request?.presentation_definition?.input_descriptors ?? []) {
    const mdoc = desc.format?.mso_mdoc;
    if (mdoc && typeof mdoc === 'object') {
      const doctypes = (mdoc as { doctype_value?: string[] }).doctype_value;
      if (doctypes?.[0]) return doctypes[0];
    }
  }

  return 'eu.europa.ec.eudi.pid.1';
}
