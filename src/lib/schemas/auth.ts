import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email("Valid email is required."),
  fullName: z.string().min(2, "Full name is required."),
  password: z.string().min(6, "Password must be at least 6 characters."),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, "Password is required."),
});
