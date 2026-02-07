import type { ValueTransformer } from 'typeorm';

const toNumber = (value: string | number | Date): number => {
  if (value instanceof Date) {
    return value.getTime();
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? Math.trunc(value) : Date.now();
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : Date.now();
};

export const timestampMsTransformer: ValueTransformer = {
  to: (value: Date | number | string | null | undefined): number | null => {
    if (value === null || value === undefined) {
      return null;
    }
    return toNumber(value);
  },
  from: (value: string | number | null | undefined): Date | null => {
    if (value === null || value === undefined) {
      return null;
    }
    return new Date(toNumber(value));
  },
};

