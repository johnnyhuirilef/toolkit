import TsValidMongoDb from 'ts-valid-mongodb';

/**
 * Interface representing the CommonJS wrapper shape that might exist at runtime.
 *
 * Due to module interoperability issues between ESM and CJS in Node.js,
 * sometimes the imported module is wrapped in a `{ default: ... }` object.
 *
 * @internal
 */
type TsValidMongoDatabaseModule = {
  default: typeof TsValidMongoDb;
};

/**
 * Type guard to check if the imported library is wrapped in a 'default' property.
 *
 * This happens often with CJS/ESM interop in NestJS environments, especially when
 * using different module systems or bundlers.
 *
 * @param value - The value to check
 * @returns True if the value has a 'default' property
 *
 * @internal
 */
function isModuleWithDefault(value: unknown): value is TsValidMongoDatabaseModule {
  return typeof value === 'object' && value !== null && 'default' in value;
}

/**
 * Safely retrieves the TsValidMongoDb class constructor, handling both ESM and CJS imports.
 *
 * This utility function eliminates the need for unsafe `as any` casting and ensures
 * the library works correctly regardless of the module system being used.
 *
 * @returns The TsValidMongoDb class constructor
 *
 * @example
 * ```typescript
 * const TsValidMongoDatabaseClass = getTsValidMongoDatabaseFactory();
 * const instance = TsValidMongoDatabaseClass.create('mongodb://localhost', 'mydb');
 * ```
 *
 * @internal
 */
export function getTsValidMongoDatabaseFactory(): typeof TsValidMongoDb {
  // We cast to unknown first because we are about to inspect its runtime shape,
  // which might differ from the compile-time type definition.
  const library = TsValidMongoDb as unknown;

  if (isModuleWithDefault(library)) {
    return library.default;
  }

  return TsValidMongoDb;
}
