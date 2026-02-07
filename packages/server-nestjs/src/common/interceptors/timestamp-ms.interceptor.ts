import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

const DATE_FIELD_PATTERN = /(At|Date)$/;

const isDateField = (key: string): boolean => {
  return DATE_FIELD_PATTERN.test(key) && !key.endsWith('Ms');
};

const toEpochMs = (value: unknown): number | null => {
  if (value === null || value === undefined) {
    return null;
  }

  if (value instanceof Date) {
    const timestamp = value.getTime();
    return Number.isNaN(timestamp) ? null : timestamp;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? Math.trunc(value) : null;
  }

  if (typeof value === 'string') {
    const timestamp = new Date(value).getTime();
    return Number.isNaN(timestamp) ? null : timestamp;
  }

  return null;
};

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  return (
    typeof value === 'object'
    && value !== null
    && !Array.isArray(value)
    && !(value instanceof Date)
    && !(value instanceof Buffer)
  );
};

export const appendTimestampMsFields = <T>(value: T): T => {
  if (Array.isArray(value)) {
    return value.map((entry) => appendTimestampMsFields(entry)) as T;
  }

  if (!isPlainObject(value)) {
    return value;
  }

  const output: Record<string, unknown> = {};

  for (const [key, rawValue] of Object.entries(value)) {
    output[key] = appendTimestampMsFields(rawValue);

    if (!isDateField(key)) {
      continue;
    }

    const msKey = `${key}Ms`;
    if (Object.prototype.hasOwnProperty.call(value, msKey)) {
      continue;
    }

    if (rawValue === null) {
      output[msKey] = null;
      continue;
    }

    const timestamp = toEpochMs(rawValue);
    if (timestamp !== null) {
      output[msKey] = timestamp;
    }
  }

  return output as T;
};

@Injectable()
export class TimestampMsInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(map((value) => appendTimestampMsFields(value)));
  }
}

