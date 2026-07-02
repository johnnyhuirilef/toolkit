import type { DbError } from '@wenu/mongo';

export const unknownError = (message: string): DbError => ({ kind: 'unknown', message });
