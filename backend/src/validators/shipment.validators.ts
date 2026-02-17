// src/validators/shipment.validators.ts

import { z } from 'zod';

export const createShipmentSchema = z.object({
  // Client (required)
  clientName: z.string().min(1, 'Nom du client requis'),
  clientNif: z.string().optional(),
  clientPhone: z.string().optional(),
  clientAddress: z.string().optional(),
  clientId: z.string().optional(),

  // Marchandise (required)
  description: z.string().min(1, 'Description de la marchandise requise'),
  hsCode: z.string().optional(),
  packaging: z.string().optional(),
  packageCount: z.number().int().positive().optional(),
  grossWeight: z.number().positive().optional(),
  netWeight: z.number().positive().optional(),

  // Valeur
  cifValue: z.number().positive().optional(),
  cifCurrency: z.enum(['USD', 'EUR', 'GNF', 'GBP', 'CNY']).default('USD'),
  exchangeRate: z.number().positive().optional(),
  fobValue: z.number().positive().optional(),
  freightValue: z.number().positive().optional(),
  insuranceValue: z.number().positive().optional(),

  // Transport
  blNumber: z.string().optional(),
  vesselName: z.string().optional(),
  voyageNumber: z.string().optional(),
  portOfLoading: z.string().optional(),
  portOfDischarge: z.string().default('CONAKRY'),
  eta: z.string().datetime({ offset: true }).optional()
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()),
  manifestNumber: z.string().optional(),
  manifestYear: z.number().int().optional(),

  // Fournisseur
  supplierName: z.string().optional(),
  supplierCountry: z.string().optional(),

  // Douane
  customsRegime: z.enum(['IM4', 'IM5', 'IM6', 'IM7', 'EX1', 'EX2', 'TR']).default('IM4'),
  customsOffice: z.string().optional(),
  customsOfficeName: z.string().optional(),
  declarantCode: z.string().optional(),
  declarantName: z.string().optional(),
  ddiNumber: z.string().optional(),

  // Conteneurs
  containers: z.array(z.object({
    number: z.string().min(1, 'Numéro de conteneur requis'),
    type: z.enum([
      'DRY_20', 'DRY_40', 'DRY_40HC',
      'REEFER_20', 'REEFER_40', 'REEFER_40HR',
      'OPEN_TOP_20', 'OPEN_TOP_40',
      'FLAT_RACK_20', 'FLAT_RACK_40',
    ]).default('DRY_40HC'),
    sealNumber: z.string().optional(),
    grossWeight: z.number().positive().optional(),
    packageCount: z.number().int().positive().optional(),
    temperature: z.number().optional(),
    description: z.string().optional(),
  })).default([]),
});

export const updateShipmentSchema = createShipmentSchema.partial().extend({
  // Fields that can be updated but not set on creation
  status: z.enum([
    'DRAFT', 'PENDING', 'ARRIVED', 'DDI_OBTAINED',
    'DECLARATION_FILED', 'LIQUIDATION_ISSUED', 'CUSTOMS_PAID',
    'BAE_ISSUED', 'TERMINAL_PAID', 'DO_RELEASED',
    'EXIT_NOTE_ISSUED', 'IN_DELIVERY', 'DELIVERED',
    'INVOICED', 'CLOSED', 'ARCHIVED',
  ]).optional(),
  doNumber: z.string().optional(),
  declarationNumber: z.string().optional(),
  liquidationNumber: z.string().optional(),
  quittanceNumber: z.string().optional(),
  baeNumber: z.string().optional(),
  bsNumber: z.string().optional(),
  circuit: z.enum(['GREEN', 'YELLOW', 'RED']).optional(),
  ata: z.string().datetime({ offset: true }).optional()
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()),

  // Taxes
  dutyDD: z.number().min(0).optional(),
  dutyRTL: z.number().min(0).optional(),
  dutyTVA: z.number().min(0).optional(),
  dutyPC: z.number().min(0).optional(),
  dutyCA: z.number().min(0).optional(),
  dutyBFU: z.number().min(0).optional(),
  totalDuties: z.number().min(0).optional(),

  // Livraison
  deliveryPlace: z.string().optional(),
  deliveryDate: z.string().datetime({ offset: true }).optional()
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()),
  deliveryDriver: z.string().optional(),
  deliveryPhone: z.string().optional(),
  deliveryTruck: z.string().optional(),
});

export const updateStatusSchema = z.object({
  status: z.enum([
    'DRAFT', 'PENDING', 'ARRIVED', 'DDI_OBTAINED',
    'DECLARATION_FILED', 'LIQUIDATION_ISSUED', 'CUSTOMS_PAID',
    'BAE_ISSUED', 'TERMINAL_PAID', 'DO_RELEASED',
    'EXIT_NOTE_ISSUED', 'IN_DELIVERY', 'DELIVERED',
    'INVOICED', 'CLOSED', 'ARCHIVED',
  ]),
  comment: z.string().optional(),
});

export const addDocumentSchema = z.object({
  type: z.enum([
    'BL', 'INVOICE', 'PACKING_LIST', 'DDI',
    'PHYTO_CERT', 'ORIGIN_CERT', 'EUR1',
    'TRANSIT_ORDER', 'DECLARATION', 'LIQUIDATION',
    'QUITTANCE', 'BAE', 'DO', 'EXIT_NOTE',
    'EIR', 'TERMINAL_INVOICE', 'TERMINAL_RECEIPT',
    'MSC_INVOICE', 'DELIVERY_NOTE', 'CUSTOMS_INVOICE', 'OTHER',
  ]),
  name: z.string().min(1, 'Nom du document requis'),
  url: z.string().min(1, 'URL requise'),
  reference: z.string().optional(),
  issueDate: z.string().datetime({ offset: true }).optional()
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()),
});

export const shipmentQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum([
    'ALL', 'DRAFT', 'PENDING', 'ARRIVED', 'DDI_OBTAINED',
    'DECLARATION_FILED', 'LIQUIDATION_ISSUED', 'CUSTOMS_PAID',
    'BAE_ISSUED', 'TERMINAL_PAID', 'DO_RELEASED',
    'EXIT_NOTE_ISSUED', 'IN_DELIVERY', 'DELIVERED',
    'INVOICED', 'CLOSED', 'ARCHIVED',
  ]).default('ALL'),
  search: z.string().optional(),
  sort: z.enum(['createdAt', 'updatedAt', 'trackingNumber', 'clientName']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export type CreateShipmentInput = z.infer<typeof createShipmentSchema>;
export type UpdateShipmentInput = z.infer<typeof updateShipmentSchema>;
