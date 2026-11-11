import { z } from 'zod';
export const roleSchema = z.enum(['admin', 'agent', 'viewer']);
export const ticketSchema = z
  .object({
    clientId: z.string().uuid(),
    subject: z.string().trim().min(3).max(150),
    description: z.string().trim().min(5).max(10000),
    priority: z.enum(['low', 'normal', 'high', 'urgent']),
    channel: z.enum(['email', 'chat', 'whatsapp']),
    assigneeId: z.string().uuid().nullable().default(null),
  })
  .strict();
export const updateTicketSchema = z
  .object({
    status: z.enum(['open', 'in_progress', 'waiting', 'resolved']).optional(),
    priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
    assigneeId: z.string().uuid().nullable().optional(),
    subject: z.string().trim().min(3).max(150).optional(),
    version: z.number().int().positive(),
  })
  .strict()
  .refine((v) => Object.keys(v).length > 1, 'Informe uma alteração.');
export const clientSchema = z
  .object({
    name: z.string().trim().min(2).max(100),
    email: z
      .string()
      .trim()
      .email()
      .max(150)
      .transform((v) => v.toLowerCase()),
    company: z.string().trim().max(120).default(''),
    phone: z.string().trim().max(40).default(''),
  })
  .strict();
export const articleSchema = z
  .object({
    title: z.string().trim().min(3).max(160),
    category: z.string().trim().min(2).max(60),
    body: z.string().trim().min(20).max(20000),
    published: z.boolean(),
  })
  .strict();
export const registerSchema = z
  .object({
    name: z.string().trim().min(2).max(100),
    email: z
      .string()
      .trim()
      .email()
      .max(150)
      .transform((v) => v.toLowerCase()),
    password: z.string().min(10).max(128),
    workspace: z.string().trim().min(2).max(80),
  })
  .strict();
export const loginSchema = z
  .object({
    email: z
      .string()
      .trim()
      .email()
      .max(150)
      .transform((v) => v.toLowerCase()),
    password: z.string().min(1).max(128),
  })
  .strict();
export const messageSchema = z
  .object({
    body: z.string().trim().min(1).max(10000),
    internal: z.boolean().default(false),
  })
  .strict();
export const memberSchema = z
  .object({
    name: z.string().trim().min(2).max(100),
    email: z
      .string()
      .trim()
      .email()
      .max(150)
      .transform((v) => v.toLowerCase()),
    password: z.string().min(10).max(128),
    role: roleSchema,
  })
  .strict();
