import { z } from 'zod';

export const articleSchema = z.object({
  title: z
    .string()
    .min(3, 'Başlyk azyndan 3 harp bolmaly')
    .max(500, 'Başlyk 500 harpdan köp bolup bilmez'),
  author: z
    .string()
    .min(2, 'Awtor ady azyndan 2 harp bolmaly')
    .max(200, 'Awtor ady 200 harpdan köp bolup bilmez'),
  authors_workplace: z
    .string()
    .max(300, 'Iş ýeri 300 harpdan köp bolup bilmez')
    .optional()
    .or(z.literal('')),
  content: z
    .string()
    .min(10, 'Mazmun azyndan 10 harp bolmaly'),
  language: z.enum(['tm', 'ru', 'en'], { required_error: 'Dili saýlaň' }),
  type: z.enum(['local', 'foreign'], { required_error: 'Görnüşi saýlaň' }),
  publication_date: z
    .string()
    .optional()
    .or(z.literal('')),
  thumbnail: z.string().optional().or(z.literal('')),
  category_ids: z.union([z.array(z.number()), z.number(), z.string(), z.undefined()]).optional(),
  abstract: z.string().max(2000, 'Gysgaça beýan 2000 harpdan köp bolup bilmez').optional().or(z.literal('')),
  keywords: z.string().max(500, 'Açar sözler 500 harpdan köp bolup bilmez').optional().or(z.literal('')),
});

export type ArticleFormData = z.infer<typeof articleSchema>;

export const bookSchema = z.object({
  title: z
    .string()
    .min(3, 'Başlyk azyndan 3 harp bolmaly')
    .max(500, 'Başlyk 500 harpdan köp bolup bilmez'),
  author: z
    .string()
    .min(2, 'Awtor ady azyndan 2 harp bolmaly')
    .max(200, 'Awtor ady 200 harpdan köp bolup bilmez'),
  authors_workplace: z
    .string()
    .max(300, 'Iş ýeri 300 harpdan köp bolup bilmez')
    .optional()
    .or(z.literal('')),
  description: z
    .string()
    .max(5000, 'Düşündiriş 5000 harpdan köp bolup bilmez')
    .optional()
    .or(z.literal('')),
  content: z.string().optional().or(z.literal('')),
  language: z.enum(['tm', 'ru', 'en'], { required_error: 'Dili saýlaň' }),
  type: z.enum(['local', 'foreign'], { required_error: 'Görnüşi saýlaň' }),
  publication_date: z.string().optional().or(z.literal('')),
  thumbnail: z.string().optional().or(z.literal('')),
  pdf_file_url: z.string().optional().or(z.literal('')),
  epub_file_url: z.string().optional().or(z.literal('')),
  category_ids: z.union([z.array(z.number()), z.number(), z.string(), z.undefined()]).optional(),
}).refine(
  (data) => data.content || data.pdf_file_url || data.epub_file_url,
  {
    message: 'Mazmun girizlmeli (tekst, PDF ýa-da EPUB)',
    path: ['content'],
  }
);

export type BookFormData = z.infer<typeof bookSchema>;

export const dissertationSchema = z.object({
  title: z
    .string()
    .min(3, 'Başlyk azyndan 3 harp bolmaly')
    .max(600, 'Başlyk 600 harpdan köp bolup bilmez'),
  author: z
    .string()
    .min(2, 'Awtor ady azyndan 2 harp bolmaly')
    .max(200, 'Awtor ady 200 harpdan köp bolup bilmez'),
  authors_workplace: z.string().max(300).optional().or(z.literal('')),
  content: z.string().min(10, 'Mazmun azyndan 10 harp bolmaly'),
  language: z.enum(['tm', 'ru', 'en'], { required_error: 'Dili saýlaň' }),
  type: z.enum(['local', 'foreign'], { required_error: 'Görnüşi saýlaň' }),
  publication_date: z.string().optional().or(z.literal('')),
  thumbnail: z.string().optional().or(z.literal('')),
  category_ids: z.union([z.array(z.number()), z.number(), z.string(), z.undefined()]).optional(),
  degree: z.string().max(100).optional().or(z.literal('')),
  supervisor: z.string().max(200).optional().or(z.literal('')),
});

export type DissertationFormData = z.infer<typeof dissertationSchema>;
