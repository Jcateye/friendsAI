import { randomBytes } from 'crypto';

const ENCODING = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const TIME_LENGTH = 10;
const RANDOM_LENGTH = 16;

const encodeTime = (time: number, length: number): string => {
  let value = time;
  let output = '';
  for (let i = 0; i < length; i += 1) {
    const mod = value % 32;
    output = ENCODING[mod] + output;
    value = (value - mod) / 32;
  }
  return output;
};

const encodeRandom = (length: number): string => {
  const bytes = randomBytes(10);
  let value = 0;
  let bits = 0;
  let output = '';

  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += ENCODING[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += ENCODING[(value << (5 - bits)) & 31];
  }

  return output.slice(0, length);
};

export const generateUlid = (): string => {
  return `${encodeTime(Date.now(), TIME_LENGTH)}${encodeRandom(RANDOM_LENGTH)}`;
};
