export type ZodCompat<T = unknown> = { readonly _output: T; parse(data: unknown): T };
export type Infer<T extends ZodCompat> = T['_output'];
