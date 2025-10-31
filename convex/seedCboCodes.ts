/**
 * Seed script to populate CBO codes
 * This is an internal mutation that bypasses authentication
 *
 * To run this script:
 * npx convex run seedCboCodes
 */

import { internalMutation } from "./_generated/server";

const cboData = [
  { title: "Técnico de obras civis", code: "3121-05" },
  { title: "Inspetor de qualidade", code: "3912-05" },
  { title: "Normalizador de metais e de compósitos", code: "7231-10" },
  { title: "Técnico eletricista", code: "3131-30" },
  { title: "Operador de guindaste (fixo)", code: "7821-10" },
  { title: "Operador de guindaste móvel", code: "7821-15" },
  { title: "Técnico em estruturas metálicas", code: "3146-15" },
  { title: "Técnico em agrimensura", code: "3123-05" },
  { title: "Técnico em manutenção de máquinas", code: "3144-10" },
  { title: "Operador de máquinas de construção civil e mineração", code: "7151-25" },
  { title: "Caldeireiro (chapas de ferro e aço)", code: "7244-10" },
  { title: "Instalador de isolantes térmicos (refrigeração e climatização)", code: "7157-15" },
  { title: "Instalador de tubulações", code: "7241-15" },
  { title: "Mecânico de refrigeração", code: "7257-05" },
  { title: "Preparador de estruturas metálicas", code: "7242-20" },
  { title: "Montador de estruturas metálicas", code: "7242-05" },
  { title: "Mecânico de manutenção de máquinas, em geral", code: "9113-05" },
  { title: "Técnico de manutenção elétrica", code: "3131-20" },
  { title: "Revestidor de interiores (papel, material plástico e emborrachados)", code: "7166-15" },
  { title: "Técnico de matéria-prima e material", code: "3911-35" },
  { title: "Desenhista projetista de construção civil", code: "3185-10" },
  { title: "Armador de estrutura de concreto armado", code: "7153-15" },
  { title: "Diretor geral de empresa e organizações (exceto de interesse público)", code: "1210-10" },
  { title: "Eletrotécnico na fabricação, montagem e instalação de máquinas e equipamentos", code: "3131-15" },
  { title: "Técnico em caldeiraria", code: "3146-10" },
  { title: "Técnico de garantia da qualidade", code: "3912-10" },
  { title: "Gerente de logística (armazenagem e distribuição)", code: "1416-15" },
  { title: "Gerente de produção e operações da construção civil e obras públicas", code: "1413-05" },
  { title: "Técnico de planejamento de produção", code: "3911-25" },
  { title: "Revestidor de superfícies de concreto", code: "7161-10" },
  { title: "Gerente de projetos e serviços de manutenção", code: "1427-05" },
  { title: "Técnico de laboratório industrial", code: "3011-05" },
  { title: "Operador de central de concreto", code: "7154-15" },
  { title: "Técnico de edificações", code: "3121-05" },
  { title: "Instalador de material isolante, a máquina (edificações)", code: "7157-30" },
  { title: "Mecânico de manutenção de bombas", code: "9111-10" },
  { title: "Gestor em Segurança", code: "2525-05" },
  { title: "Gerente de recursos humanos", code: "1422-05" },
  { title: "Contador", code: "2522-10" },
  { title: "Desenhista técnico (construção civil)", code: "3181-15" },
  { title: "Tecnólogo em gestão da tecnologia da informação", code: "1425-35" },
  { title: "Ceramista", code: "7523-05" },
  { title: "Mestre de pintura (tratamento de superfícies)", code: "7201-35" },
  { title: "Técnico de transmissão (telecomunicações)", code: "3133-20" },
  { title: "Técnico em mecânica de precisão", code: "3141-05" },
  { title: "Galvanizador", code: "7232-15" },
  { title: "Técnico em segurança do trabalho", code: "3516-05" },
  { title: "Montador de equipamentos elétricos", code: "7311-35" },
  { title: "Operador de máquina de usinagem de madeira (produção em série)", code: "7734-15" },
  { title: "Modelador de madeira", code: "7711-10" },
  { title: "Metalizador (banho quente)", code: "7232-25" },
  { title: "Montador de máquinas-ferramentas (usinagem de metais)", code: "7252-25" },
];

export default internalMutation({
  handler: async (ctx) => {
    let inserted = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const cbo of cboData) {
      try {
        // Check if CBO code already exists
        const existing = await ctx.db
          .query("cboCodes")
          .withIndex("by_code", (q) => q.eq("code", cbo.code))
          .first();

        if (existing) {
          console.log(`⏭️  Skipping existing CBO: ${cbo.code} - ${cbo.title}`);
          skipped++;
          continue;
        }

        // Insert the CBO code with empty description for now
        await ctx.db.insert("cboCodes", {
          code: cbo.code,
          title: cbo.title,
          description: "", // Empty description as not provided in the source data
        });

        console.log(`✅ Inserted CBO: ${cbo.code} - ${cbo.title}`);
        inserted++;
      } catch (error) {
        const errorMsg = `Failed to insert ${cbo.code}: ${error}`;
        console.error(`❌ ${errorMsg}`);
        errors.push(errorMsg);
      }
    }

    console.log("\n=== Seed Summary ===");
    console.log(`✅ Inserted: ${inserted}`);
    console.log(`⏭️  Skipped: ${skipped}`);
    console.log(`❌ Errors: ${errors.length}`);

    return {
      success: true,
      inserted,
      skipped,
      errors,
      total: cboData.length,
    };
  },
});
