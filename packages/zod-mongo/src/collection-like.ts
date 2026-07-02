import type { Collection, Db, Document } from 'mongodb';

// ponytail: Pick'd from the driver's own Collection<T> — stays accurate across mongodb
// v5/v6/v7 without hand-duplicating method signatures. CollectionLike is the full method
// surface the repository exercises; it appears in no production signature (the repository
// holds the driver's real Collection) and exists for test fixtures and the type tests that
// pin driver assignability. Only DatabaseLike is public API.
export type CollectionLike<T extends Document = Document> = Pick<
  Collection<T>,
  | 'findOne'
  | 'find'
  | 'findOneAndUpdate'
  | 'findOneAndReplace'
  | 'findOneAndDelete'
  | 'insertOne'
  | 'insertMany'
  | 'updateMany'
  | 'deleteMany'
  | 'countDocuments'
  | 'aggregate'
>;

// ponytail: query-builder.ts only ever calls .find() — narrower than CollectionLike so its
// unit fixture doesn't need to stub methods it never exercises.
export type QueryableCollection<T extends Document = Document> = Pick<Collection<T>, 'find'>;

// ponytail: compat/driver.ts's findOneAndModify() shim only calls the three findOneAnd*
// methods — narrower than CollectionLike so its unit fixtures stub only what's exercised.
export type FindOneAndModifyCollection<T extends Document = Document> = Pick<
  Collection<T>,
  'findOneAndUpdate' | 'findOneAndReplace' | 'findOneAndDelete'
>;

// ponytail: Pick'd from Db — only `.collection()` is consumed (to obtain a CollectionLike
// handle and, in indexes.ts, to call createIndexes on the untyped collection it returns).
export type DatabaseLike = Pick<Db, 'collection'>;
