/**
 * Migration Script: Update Case Statuses Order Numbers
 *
 * This migration updates the `orderNumber` field for case statuses to:
 * 1. Remove orderNumber from "Exigência" and "Juntada de documento"
 *    (these statuses can occur at any point in the workflow)
 * 2. Renumber the remaining statuses sequentially (1-13)
 *
 * Features:
 * - Idempotent (safe to run multiple times)
 * - Progress logging
 * - Maps each status code to its correct orderNumber
 *
 * Usage:
 * npx convex run migrations/updateCaseStatusesOrderNumbers
 */

import { internalMutation } from "../_generated/server";

// Updated mapping from case status code to orderNumber
// "Exigência" and "Juntada de documento" are now undefined (not part of workflow sequence)
const ORDER_NUMBER_MAPPING: Record<string, number | undefined> = {
  // Workflow sequence (1-13) - "Exigência" (was 4) and "Juntada de documento" (was 5) removed
  em_preparacao: 1,
  em_tramite: 2,
  encaminhado_analise: 3,
  proposta_deferimento: 4, // Was 6
  deferido: 5, // Was 7
  publicado_dou: 6, // Was 8
  emissao_vitem: 7, // Was 9
  entrada_brasil: 8, // Was 10
  rnm: 9, // Was 11
  em_renovacao: 10, // Was 12
  pedido_cancelamento: 11, // Was 13
  pedido_arquivamento: 12, // Was 14
  pedido_cancelado: 13, // Was 15

  // Special statuses without orderNumber (can occur at any point in workflow)
  exigencia: undefined, // Was 4 - now undefined
  juntada_documento: undefined, // Was 5 - now undefined
  nova_solicitacao_visto: undefined,
  diario_oficial: undefined,
  em_analise_tecnica: undefined,
};

export default internalMutation({
  handler: async (ctx) => {
    console.log("=== Starting Migration: Update Case Statuses Order Numbers ===\n");
    console.log("This migration removes orderNumber from 'Exigência' and 'Juntada de documento'");
    console.log("and renumbers the remaining statuses sequentially (1-13).\n");

    const startTime = Date.now();
    let updated = 0;
    let skipped = 0;
    let notFound = 0;
    const errors: string[] = [];

    try {
      // Get all case statuses
      const allStatuses = await ctx.db.query("caseStatuses").collect();
      console.log(`Found ${allStatuses.length} case statuses to process\n`);

      for (const status of allStatuses) {
        try {
          // Get the new orderNumber for this status code
          const newOrderNumber = ORDER_NUMBER_MAPPING[status.code];

          // Check if we have a mapping for this code
          if (newOrderNumber === undefined && !(status.code in ORDER_NUMBER_MAPPING)) {
            notFound++;
            const errorMsg = `No mapping found for status code: ${status.code}`;
            errors.push(errorMsg);
            console.warn(`  ⚠ Warning: ${errorMsg}`);
            continue;
          }

          // Check if the orderNumber is already correct
          if (status.orderNumber === newOrderNumber) {
            skipped++;
            console.log(`  ⊘ Skipped: ${status.name} (${status.code}) - orderNumber already ${newOrderNumber === undefined ? 'undefined' : newOrderNumber}`);
            continue;
          }

          // Update the status with the new orderNumber
          await ctx.db.patch(status._id, {
            orderNumber: newOrderNumber,
            updatedAt: Date.now(),
          });

          updated++;
          const oldValue = status.orderNumber === undefined ? 'undefined' : status.orderNumber;
          const newValue = newOrderNumber === undefined ? 'undefined' : newOrderNumber;
          console.log(`  ✓ Updated: ${status.name} (${status.code}) → orderNumber changed from ${oldValue} to ${newValue}`);
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
      console.log(`Skipped (already correct): ${skipped}`);
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
