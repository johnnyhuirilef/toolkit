export type ZodCompat = { readonly _output: unknown; parse(data: unknown): unknown };
export type Infer<T extends ZodCompat> = T['_output'];
