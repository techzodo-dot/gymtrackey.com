import { z } from "zod";

export const emailSchema = z.string().trim().toLowerCase().email().max(254);
export const phoneSchema = z.string().trim().regex(/^\+?[0-9 ()-]{7,18}$/, "Enter a valid phone number");
export const passwordSchema = z
  .string()
  .min(10, "Use at least 10 characters")
  .max(128)
  .regex(/[a-z]/, "Add a lowercase letter")
  .regex(/[A-Z]/, "Add an uppercase letter")
  .regex(/[0-9]/, "Add a number");

export const registerSchema = z.object({
  gymName: z.string().trim().min(2).max(100),
  ownerName: z.string().trim().min(2).max(100),
  email: emailSchema,
  phone: phoneSchema,
  password: passwordSchema,
  city: z.string().trim().min(2).max(80),
  state: z.string().trim().min(2).max(80),
  country: z.string().trim().min(2).max(80).default("India"),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(128),
  remember: z.boolean().optional().default(false),
});

export const leadSchema = z.object({
  name: z.string().trim().min(2).max(100),
  gymName: z.string().trim().min(2).max(100),
  phone: phoneSchema,
  email: emailSchema,
  memberCount: z.string().trim().max(30).optional(),
  city: z.string().trim().max(80).optional(),
  message: z.string().trim().max(2000).optional(),
});

export const contactSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: emailSchema,
  phone: phoneSchema.optional().or(z.literal("").transform(() => undefined)),
  subject: z.string().trim().min(2).max(150),
  message: z.string().trim().min(5).max(3000),
});
