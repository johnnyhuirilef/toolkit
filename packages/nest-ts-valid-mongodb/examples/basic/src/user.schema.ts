import { z } from 'zod';

/**
 * Zod schema for User validation
 * This provides both runtime validation and TypeScript type inference
 */
export const UserSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email format'),
  age: z.number().min(18, 'Must be at least 18 years old').optional(),
});

/**
 * TypeScript type inferred from Zod schema
 */
export type User = z.infer<typeof UserSchema>;
