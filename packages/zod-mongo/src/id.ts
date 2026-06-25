import { randomUUID } from 'node:crypto';

import { ObjectId } from 'mongodb';

import type { Infer, ZodCompat } from './compat/zod.js';

export type IdStrategy = 'objectid' | 'uuid' | 'string' | ZodCompat;

export type InferIdType<T extends IdStrategy> = T extends 'objectid'
  ? ObjectId
  : T extends 'uuid'
    ? string
    : T extends 'string'
      ? string
      : T extends ZodCompat
        ? Infer<T>
        : never;

// generateId handles only auto-generated strategies.
// 'string' and custom ZodCompat require caller-supplied values.
export const generateId = (strategy: 'objectid' | 'uuid'): ObjectId | string => {
  if (strategy === 'objectid') return new ObjectId();
  return randomUUID();
};
