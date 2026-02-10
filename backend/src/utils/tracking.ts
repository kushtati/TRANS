// src/utils/tracking.ts

import { prisma } from '../config/prisma.js';

/**
 * Generates a unique tracking number in the format: TR-YYMMDD-XXXX
 * Example: TR-260206-0042
 */
export const generateTrackingNumber = async (companyId: string): Promise<string> => {
  const now = new Date();
  const yy = now.getFullYear().toString().slice(2);
  const mm = (now.getMonth() + 1).toString().padStart(2, '0');
  const dd = now.getDate().toString().padStart(2, '0');
  const prefix = `TR-${yy}${mm}${dd}`;

  // Count today's shipments for this company to get next sequence
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

  const count = await prisma.shipment.count({
    where: {
      companyId,
      createdAt: {
        gte: todayStart,
        lt: todayEnd,
      },
    },
  });

  const sequence = (count + 1).toString().padStart(4, '0');
  const trackingNumber = `${prefix}-${sequence}`;

  // Verify uniqueness (edge case: race condition)
  const existing = await prisma.shipment.findUnique({
    where: { trackingNumber },
  });

  if (existing) {
    // Fallback: add random suffix
    const randomSuffix = Math.floor(Math.random() * 9000 + 1000);
    return `${prefix}-${randomSuffix}`;
  }

  return trackingNumber;
};
