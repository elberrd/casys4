/**
 * Seed script to populate Case Statuses (Status Andamento)
 * This is an internal mutation that bypasses authentication
 *
 * To run this script:
 * npx convex run seedCaseStatuses
 */

import { internalMutation } from "./_generated/server";

const caseStatusesData = [
  {
    name: "Em Preparação",
    nameEn: "In Preparation",
    code: "em_preparacao",
    description: "Processo em preparação inicial",
    category: "preparation",
    color: "#3B82F6", // blue
    sortOrder: 1,
  },
  {
    name: "Em Trâmite",
    nameEn: "In Progress",
    code: "em_tramite",
    description: "Processo em andamento",
    category: "in_progress",
    color: "#FBBF24", // yellow
    sortOrder: 2,
  },
  {
    name: "Encaminhado a análise",
    nameEn: "Forwarded for Analysis",
    code: "encaminhado_analise",
    description: "Processo encaminhado para análise",
    category: "review",
    color: "#F97316", // orange
    sortOrder: 3,
  },
  {
    name: "Exigência",
    nameEn: "Requirements Requested",
    code: "exigencia",
    description: "Exigências solicitadas",
    category: "review",
    color: "#F97316", // orange
    sortOrder: 4,
  },
  {
    name: "Juntada de documento",
    nameEn: "Document Submission",
    code: "juntada_documento",
    description: "Documentos sendo juntados ao processo",
    category: "in_progress",
    color: "#FBBF24", // yellow
    sortOrder: 5,
  },
  {
    name: "Deferido",
    nameEn: "Approved",
    code: "deferido",
    description: "Processo deferido",
    category: "approved",
    color: "#10B981", // green
    sortOrder: 6,
  },
  {
    name: "Publicado no DOU",
    nameEn: "Published in Official Gazette",
    code: "publicado_dou",
    description: "Publicado no Diário Oficial da União",
    category: "completed",
    color: "#059669", // emerald
    sortOrder: 7,
  },
  {
    name: "Emissão do VITEM",
    nameEn: "VITEM Issuance",
    code: "emissao_vitem",
    description: "Emissão do visto temporário",
    category: "completed",
    color: "#059669", // emerald
    sortOrder: 8,
  },
  {
    name: "Entrada no Brasil",
    nameEn: "Entry to Brazil",
    code: "entrada_brasil",
    description: "Entrada do estrangeiro no Brasil",
    category: "completed",
    color: "#059669", // emerald
    sortOrder: 9,
  },
  {
    name: "Registro Nacional Migratório (RNM)",
    nameEn: "National Migration Registry",
    code: "rnm",
    description: "Registro Nacional Migratório concluído",
    category: "completed",
    color: "#059669", // emerald
    sortOrder: 10,
  },
  {
    name: "Em Renovação",
    nameEn: "Under Renewal",
    code: "em_renovacao",
    description: "Processo em renovação",
    category: "in_progress",
    color: "#FBBF24", // yellow
    sortOrder: 11,
  },
  {
    name: "Nova Solicitação de Visto",
    nameEn: "New Visa Request",
    code: "nova_solicitacao_visto",
    description: "Nova solicitação de visto",
    category: "preparation",
    color: "#3B82F6", // blue
    sortOrder: 12,
  },
  {
    name: "Pedido de Cancelamento",
    nameEn: "Cancellation Request",
    code: "pedido_cancelamento",
    description: "Solicitação de cancelamento do processo",
    category: "cancelled",
    color: "#EF4444", // red
    sortOrder: 13,
  },
  {
    name: "Pedido de Arquivamento",
    nameEn: "Archive Request",
    code: "pedido_arquivamento",
    description: "Solicitação de arquivamento do processo",
    category: "cancelled",
    color: "#EF4444", // red
    sortOrder: 14,
  },
  {
    name: "Pedido cancelado",
    nameEn: "Request Cancelled",
    code: "pedido_cancelado",
    description: "Processo cancelado",
    category: "cancelled",
    color: "#EF4444", // red
    sortOrder: 15,
  },
  {
    name: "Proposta de Deferimento",
    nameEn: "Proposal for Approval",
    code: "proposta_deferimento",
    description: "Proposta de deferimento submetida",
    category: "review",
    color: "#F97316", // orange
    sortOrder: 16,
  },
  {
    name: "Diário Oficial",
    nameEn: "Official Gazette",
    code: "diario_oficial",
    description: "Aguardando publicação no Diário Oficial",
    category: "review",
    color: "#F97316", // orange
    sortOrder: 17,
  },
];

export default internalMutation({
  handler: async (ctx) => {
    let inserted = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const status of caseStatusesData) {
      try {
        // Check if case status already exists by code
        const existing = await ctx.db
          .query("caseStatuses")
          .withIndex("by_code", (q) => q.eq("code", status.code))
          .first();

        if (existing) {
          skipped++;
          console.log(`Skipped: Case status with code "${status.code}" already exists`);
          continue;
        }

        // Insert new case status
        await ctx.db.insert("caseStatuses", {
          ...status,
          isActive: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        inserted++;
        console.log(`Inserted: ${status.name} (${status.code})`);
      } catch (error) {
        const errorMsg = `Failed to insert ${status.name}: ${error}`;
        errors.push(errorMsg);
        console.error(errorMsg);
      }
    }

    console.log("\n=== Seed Case Statuses Summary ===");
    console.log(`Total: ${caseStatusesData.length}`);
    console.log(`Inserted: ${inserted}`);
    console.log(`Skipped: ${skipped}`);
    console.log(`Errors: ${errors.length}`);

    if (errors.length > 0) {
      console.error("\nErrors:");
      errors.forEach((err) => console.error(`  - ${err}`));
    }

    return {
      total: caseStatusesData.length,
      inserted,
      skipped,
      errors,
    };
  },
});
