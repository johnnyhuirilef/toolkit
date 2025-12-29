import { z } from 'zod';

export const UserSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  age: z.number().int().min(0),
});

export type User = z.infer<typeof UserSchema>;
