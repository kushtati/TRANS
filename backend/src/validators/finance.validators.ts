// src/validators/finance.validators.ts

import { z } from 'zod';

export const createExpenseSchema = z.object({
  shipmentId: z.string().min(1, 'ID du dossier requis'),
  type: z.enum(['PROVISION', 'DISBURSEMENT']),
  category: z.enum([
    'DD', 'TVA', 'RTL', 'PC', 'CA', 'BFU', 'DDI_FEE',
    'ACCONAGE', 'BRANCHEMENT', 'SURESTARIES', 'MANUTENTION',
    'PASSAGE_TERRE', 'RELEVAGE', 'SECURITE_TERMINAL',
    'DO_FEE', 'SEAWAY_BILL', 'MANIFEST_FEE', 'CONTAINER_DAMAGE',
    'SECURITE_MSC', 'SURCHARGE', 'PAC', 'ADP_FEE',
    'TRANSPORT', 'TRANSPORT_ADD',
    'HONORAIRES', 'COMMISSION',
    'ASSURANCE', 'MAGASINAGE', 'SCANNER', 'ESCORTE', 'AUTRE',
  ]),
  description: z.string().min(1, 'Description requise'),
  amount: z.number().positive('Le montant doit être positif'),
  quantity: z.number().int().positive().optional(),
  unitPrice: z.number().positive().optional(),
  reference: z.string().optional(),
  supplier: z.string().optional(),
  notes: z.string().optional(),
});

export const updateExpenseSchema = z.object({
  description: z.string().min(1).optional(),
  amount: z.number().positive().optional(),
  reference: z.string().optional(),
  supplier: z.string().optional(),
  notes: z.string().optional(),
});

export const financeStatsQuerySchema = z.object({
  period: z.enum(['week', 'month', 'quarter', 'year', 'all']).default('month'),
});

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
