import type {
  Collection,
  Filter,
  FindOneAndDeleteOptions,
  FindOneAndReplaceOptions,
  FindOneAndUpdateOptions,
  ModifyResult,
  UpdateFilter,
  WithId,
  WithoutId,
} from 'mongodb';

// ponytail: version detection at load time — avoids per-call overhead
const MONGO_MAJOR = (() => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports, unicorn/prefer-module
  const version: string = (require('mongodb/package.json') as { version: string }).version;
  const match = /^(\d+)/.exec(version);
  return match ? Number(match[1]) : 6;
})();

type FindOneAndModifyOp<T> =
  | { kind: 'update'; update: UpdateFilter<T>; options?: FindOneAndUpdateOptions }
  | { kind: 'delete'; options?: FindOneAndDeleteOptions }
  | { kind: 'upsert'; replacement: WithoutId<T>; options?: FindOneAndReplaceOptions };

// ponytail: v5 returns ModifyResult<T> ({ value: WithId<T> | null, ... }); v6/7 returns WithId<T> | null directly.
// ModifyResult<T> and WithId<T> don't overlap, so we go through unknown for the v5 branch only.
const extractResult = <T>(raw: unknown, isV5: boolean): WithId<T> | null => {
  if (isV5) {
    const result = raw as ModifyResult<T> | null | undefined;
    return result?.value ?? null;
  }
  return (raw as WithId<T> | null) ?? null;
};

export const findOneAndModify = async <T extends object>(
  collection: Collection<T>,
  filter: Filter<T>,
  op: FindOneAndModifyOp<T>,
): Promise<WithId<T> | null> => {
  const isV5 = MONGO_MAJOR <= 5;
  if (op.kind === 'delete') {
    const raw = await collection.findOneAndDelete(filter, op.options ?? {});
    return extractResult<T>(raw, isV5);
  }
  if (op.kind === 'upsert') {
    const raw = await collection.findOneAndReplace(filter, op.replacement, {
      upsert: true,
      returnDocument: 'after',
      ...op.options,
    });
    return extractResult<T>(raw, isV5);
  }
  const raw = await collection.findOneAndUpdate(filter, op.update, {
    returnDocument: 'after',
    ...op.options,
  });
  return extractResult<T>(raw, isV5);
};
