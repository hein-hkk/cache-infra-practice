import { z } from 'zod';

export const QuoteSchema = z.object({
  id: z.string().uuid(),
  text: z.string(),
  author: z.string(),
  createdAt: z.string().datetime(),
});

export type Quote = z.infer<typeof QuoteSchema>;

export const HighlightSchema = z.object({
  id: z.string().uuid(),
  text: z.string(),
  author: z.string(),
  setAt: z.string().datetime(),
});

export type Highlight = z.infer<typeof HighlightSchema>;

export const ApiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
});

export type ApiError = z.infer<typeof ApiErrorSchema>;
