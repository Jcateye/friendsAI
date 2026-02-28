const JWT_SEGMENT_REGEX = /^[A-Za-z0-9_-]+$/;

const TRAILING_TOKEN_SUFFIX_REGEX = /(token|jwt)$/i;

const EXPECTED_SIGNATURE_LENGTH_BY_ALG: Record<string, number> = {
  HS256: 43,
  HS384: 64,
  HS512: 86,
};

type JwtRecord = Record<string, unknown>;

export interface MeetingAgentTokenInspection {
  token: string;
  header: JwtRecord;
  payload: JwtRecord;
  expiresAt?: string;
  isExpired: boolean;
}

export function extractMeetingAgentToken(text: string | undefined): string | undefined {
  if (!text) {
    return undefined;
  }

  const explicitMatches = Array.from(
    text.matchAll(/dt-meeting-agent-token[\s:=："']*([^\s"'，。；;]+)/gi),
  );
  for (let index = explicitMatches.length - 1; index >= 0; index -= 1) {
    const candidate = explicitMatches[index]?.[1];
    const sanitized = sanitizeMeetingAgentToken(candidate);
    if (sanitized) {
      return sanitized;
    }
  }

  const jwtMatches = text.match(/[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g) ?? [];
  for (let index = jwtMatches.length - 1; index >= 0; index -= 1) {
    const candidate = jwtMatches[index];
    if (!candidate?.startsWith('eyJ')) {
      continue;
    }
    const sanitized = sanitizeMeetingAgentToken(candidate);
    if (sanitized) {
      return sanitized;
    }
  }

  return undefined;
}

export function inspectMeetingAgentToken(
  token: string | undefined,
): MeetingAgentTokenInspection | undefined {
  const normalized = sanitizeMeetingAgentToken(token);
  if (!normalized) {
    return undefined;
  }

  const [encodedHeader, encodedPayload] = normalized.split('.');
  const header = decodeJwtRecord(encodedHeader);
  const payload = decodeJwtRecord(encodedPayload);
  if (!header || !payload) {
    return undefined;
  }

  const expValue = readNumericClaim(payload.exp);
  const expiresAt =
    typeof expValue === 'number' ? new Date(expValue * 1000).toISOString() : undefined;
  const isExpired =
    typeof expValue === 'number' ? expValue * 1000 <= Date.now() : false;

  return {
    token: normalized,
    header,
    payload,
    expiresAt,
    isExpired,
  };
}

export function sanitizeMeetingAgentToken(token: string | undefined): string | undefined {
  const raw = typeof token === 'string' ? token.trim() : '';
  if (!raw) {
    return undefined;
  }

  const candidates = Array.from(
    new Set([
      raw,
      raw.replace(/^[`"'“”‘’([{<\s]+|[`"'“”‘’)\]}>。，、；;:：\s]+$/g, ''),
    ]),
  );

  for (const candidate of candidates) {
    const normalized = normalizeJwtCandidate(candidate);
    if (normalized) {
      return normalized;
    }
  }

  return undefined;
}

function normalizeJwtCandidate(candidate: string): string | undefined {
  const parts = candidate.split('.');
  if (parts.length !== 3) {
    return undefined;
  }

  const encodedHeader = parts[0]?.trim();
  const encodedPayload = parts[1]?.trim();
  const rawSignature = parts[2]?.trim();
  if (!encodedHeader || !encodedPayload || !rawSignature) {
    return undefined;
  }

  if (!JWT_SEGMENT_REGEX.test(encodedHeader) || !JWT_SEGMENT_REGEX.test(encodedPayload)) {
    return undefined;
  }

  const header = decodeJwtRecord(encodedHeader);
  const payload = decodeJwtRecord(encodedPayload);
  if (!header || !payload) {
    return undefined;
  }

  const signatureVariants = buildSignatureVariants(
    rawSignature,
    typeof header.alg === 'string' ? header.alg : undefined,
  );

  for (const signature of signatureVariants) {
    if (!JWT_SEGMENT_REGEX.test(signature)) {
      continue;
    }
    return `${encodedHeader}.${encodedPayload}.${signature}`;
  }

  return undefined;
}

function buildSignatureVariants(signature: string, alg: string | undefined): string[] {
  const trimmed = signature.trim();
  const variants: string[] = [];
  const pushVariant = (value: string) => {
    if (value && !variants.includes(value)) {
      variants.push(value);
    }
  };

  const strippedSuffix = trimmed.replace(TRAILING_TOKEN_SUFFIX_REGEX, '');
  const expectedLength = alg ? EXPECTED_SIGNATURE_LENGTH_BY_ALG[alg.toUpperCase()] : undefined;

  if (TRAILING_TOKEN_SUFFIX_REGEX.test(trimmed) && strippedSuffix) {
    pushVariant(strippedSuffix);
  }
  if (expectedLength && strippedSuffix.length > expectedLength) {
    pushVariant(strippedSuffix.slice(0, expectedLength));
  }
  if (expectedLength && trimmed.length > expectedLength) {
    pushVariant(trimmed.slice(0, expectedLength));
  }

  pushVariant(trimmed);

  return variants.filter((value) => value.length > 0);
}

function decodeJwtRecord(encoded: string): JwtRecord | undefined {
  try {
    const decoded = Buffer.from(encoded, 'base64url').toString('utf8');
    const parsed = JSON.parse(decoded) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return undefined;
    }
    return parsed as JwtRecord;
  } catch {
    return undefined;
  }
}

function readNumericClaim(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return undefined;
}
