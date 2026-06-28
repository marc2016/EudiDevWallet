export type LogLevel = 'info' | 'success' | 'warn' | 'error';
export type LogCategory =
  | 'parse'
  | 'fetch'
  | 'claims'
  | 'cert'
  | 'build'
  | 'http'
  | 'settings';

export interface ActivityLogEntry {
  id: string;
  timestamp: Date;
  level: LogLevel;
  category: LogCategory;
  message: string;
  details?: unknown;
}

export type CertificateMode = 'off' | 'display' | 'soft' | 'strict';
export type ResponseMode = 'auto' | 'direct_post' | 'direct_post_jwt' | 'raw_json';

export interface PresentationDefinition {
  id?: string;
  input_descriptors?: InputDescriptor[];
}

export interface InputDescriptor {
  id: string;
  name?: string;
  purpose?: string;
  constraints?: {
    fields?: Array<{
      path?: string[];
      filter?: { type?: string };
    }>;
  };
}

export interface DcqlQuery {
  credentials?: Array<{
    id?: string;
    format?: string;
    meta?: { vct_values?: string[] };
    claims?: Array<{ path?: string[]; id?: string }>;
  }>;
}

export interface AuthorizationRequest {
  client_id?: string;
  response_uri?: string;
  response_mode?: string;
  response_type?: string;
  nonce?: string;
  state?: string;
  presentation_definition?: PresentationDefinition;
  presentation_definition_uri?: string;
  dcql_query?: DcqlQuery;
  request_uri?: string;
  rawParams?: Record<string, string>;
  requestJwt?: string;
  requestJwtHeader?: Record<string, unknown>;
  requestJwtPayload?: Record<string, unknown>;
}

export interface ExtractedClaim {
  key: string;
  path: string;
  label: string;
}

export interface CertificateInfo {
  subject?: string;
  issuer?: string;
  serialNumber?: string;
  notBefore?: string;
  notAfter?: string;
  san?: string[];
  raw?: string;
}

export interface CertificateValidationResult {
  valid: boolean;
  level: 'success' | 'warn' | 'error';
  messages: string[];
  wrpac?: CertificateInfo;
  wrprc?: Record<string, unknown>;
  signatureValid?: boolean;
  blocksApproval: boolean;
}

export interface MockIdentity {
  id: string;
  label: string;
  claims: Record<string, string>;
}

export interface BuiltResponse {
  contentType: string;
  body: string | Record<string, unknown>;
  mode: string;
}

export interface SendResponseResult {
  ok: boolean;
  status?: number;
  statusText?: string;
  responseBody?: string;
  error?: string;
  corsError?: boolean;
}

export type LogFn = (
  level: LogLevel,
  category: LogCategory,
  message: string,
  details?: unknown,
) => void;
