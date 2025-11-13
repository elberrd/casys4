/**
 * Migration Script: Add Order Number to Case Statuses
 *
 * This migration adds the `orderNumber` field to existing case status records
 * to support workflow sequence tracking.
 *
 * Features:
 * - Idempotent (safe to run multiple times)
 * - Progress logging
 * - Maps each status code to its correct orderNumber
 *
 * Usage:
 * npx convex run migrations/addOrderNumberToCaseStatuses
 */

import { internalMutation } from "../_generated/server";

// Mapping from case status code to orderNumber
const ORDER_NUMBER_MAPPING: Record<string, number | undefined> = {
  // Workflow sequence (1-15)
  em_preparacao: 1,
  em_tramite: 2,
  encaminhado_analise: 3,
  exigencia: 4,
  juntada_documento: 5,
  proposta_deferimento: 6,
  deferido: 7,
  publicado_dou: 8,
  emissao_vitem: 9,
  entrada_brasil: 10,
  rnm: 11,
  em_renovacao: 12,
  pedido_cancelamento: 13,
  pedido_arquivamento: 14,
  pedido_cancelado: 15,

  // Special statuses without orderNumber
  nova_solicitacao_visto: undefined,
  diario_oficial: undefined,
  em_analise_tecnica: undefined, // Technical analysis - not part of main workflow
};

export default internalMutation({
  handler: async (ctx) => {
    console.log("=== Starting Migration: Add Order Number to Case Statuses ===\n");

    const startTime = Date.now();
    let updated = 0;
    let skipped = 0;
    let notFound = 0;
    const errors: string[] = [];

    try {
      // Get all case statuses
      const allStatuses = await ctx.db.query("caseStatuses").collect();
      console.log(`Found ${allStatuses.length} case statuses to process`);

      for (const status of allStatuses) {
        try {
          // Skip if orderNumber already exists
          if (status.orderNumber !== undefined) {
            skipped++;
            console.log(`  ⊘ Skipped: ${status.name} (${status.code}) - orderNumber already set to ${status.orderNumber}`);
            continue;
          }

          // Get the orderNumber for this status code
          const orderNumber = ORDER_NUMBER_MAPPING[status.code];

          // Check if we have a mapping for this code
          if (orderNumber === undefined && !(status.code in ORDER_NUMBER_MAPPING)) {
            notFound++;
            const errorMsg = `No mapping found for status code: ${status.code}`;
            errors.push(errorMsg);
            console.warn(`  ⚠ Warning: ${errorMsg}`);
            continue;
          }

          // Update the status with the orderNumber
          await ctx.db.patch(status._id, {
            orderNumber,
            updatedAt: Date.now(),
          });

          updated++;
          if (orderNumber !== undefined) {
            console.log(`  ✓ Updated: ${status.name} (${status.code}) → orderNumber = ${orderNumber}`);
          } else {
            console.log(`  ✓ Updated: ${status.name} (${status.code}) → orderNumber = undefined (not in workflow)`);
          }
        } catch (error) {
          const errorMsg = `Failed to update status ${status.code}: ${error}`;
          errors.push(errorMsg);
          console.error(`  ✗ Error: ${errorMsg}`);
        }
      }

      const duration = Date.now() - startTime;

      console.log("\n=== Migration Summary ===");
      console.log(`Total statuses: ${allStatuses.length}`);
      console.log(`Updated: ${updated}`);
      console.log(`Skipped (already had orderNumber): ${skipped}`);
      console.log(`Not found in mapping: ${notFound}`);
      console.log(`Errors: ${errors.length}`);
      console.log(`Duration: ${duration}ms`);

      if (errors.length > 0) {
        console.error("\nErrors encountered:");
        errors.forEach((err) => console.error(`  - ${err}`));
      }

      console.log("\n=== Migration Complete ===");

      return {
        total: allStatuses.length,
        updated,
        skipped,
        notFound,
        errors,
        duration,
      };
    } catch (error) {
      const errorMsg = `Fatal error during migration: ${error}`;
      console.error(`\n✗ ${errorMsg}`);
      throw error;
    }
  },
});
