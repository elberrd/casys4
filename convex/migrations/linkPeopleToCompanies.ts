import { mutation } from "../_generated/server";
import { v } from "convex/values";

// List of people who should be linked to companies (from CSV)
const PEOPLE_COMPANY_LINKS = [
  { name: "Abison Thomas", company: "ENKA", isContact: true },
  { name: "administracao@tennessine.com.br", company: "TENNESSINE INSTRUMENTAÇÃO ANALÍTICA COMÉRCIO E SERVIÇOS LTDA.", isContact: true },
  { name: "Ahmet Melih Umarusman", company: "CADDELL CONSTRUCTION CO. (DE), LLC.", isContact: false },
  { name: "Alexandra Esteves Velloso", company: "SWIFT TECHNICAL SERVIÇOS TÉCNICOS ESPECIALIZADOS LTDA.", isContact: true },
  { name: "Carlos Resende", company: "SIMTECH REPRESENTAÇÕES LTDA.", isContact: true },
  { name: "Cenk Ferdi Demir", company: "CADDELL CONSTRUCTION CO. (DE), LLC.", isContact: true },
  { name: "Daniele Neves", company: "CLADTEK DO BRASIL INDÚSTRIA E COMÉRCIO DE TUBOS E REVESTIMENTOS LTDA", isContact: true },
  { name: "David Andrew Groth Jr", company: "CADDELL CONSTRUCTION CO. (DE), LLC.", isContact: true },
  { name: "Eduard Richter", company: "W-INDUSTRIES", isContact: true },
  { name: "Fernanda Negrão", company: "SWIFT TECHNICAL SERVIÇOS TÉCNICOS ESPECIALIZADOS LTDA.", isContact: true },
  { name: "Filipi Wesley", company: "TENNESSINE INSTRUMENTAÇÃO ANALÍTICA COMÉRCIO E SERVIÇOS LTDA.", isContact: true },
  { name: "Gabriella Rodrigues", company: "MITSUI GÁS E ENERGIA DO BRASIL LTDA.", isContact: true },
  { name: "Hsia Min Wi", company: "EPPEI BRASIL TECNOLOGIA EM ENERGIA ELÉTRICA LTDA.", isContact: true },
  { name: "Huseyin Serhan Erinc", company: "CADDELL CONSTRUCTION CO. (DE), LLC.", isContact: true },
  { name: "Isabela Resende", company: "CADDELL CONSTRUCTION CO. (DE), LLC.", isContact: true },
  { name: "Ivanildes", company: "HEINRICH-BOLL-STIFTUNG", isContact: true },
  { name: "Jorge Pedroso", company: "SEACREST PETRÓLEO S.A.", isContact: true },
  { name: "Juliana Lima", company: "SWIFT TECHNICAL SERVIÇOS TÉCNICOS ESPECIALIZADOS LTDA.", isContact: true },
  { name: "Luana Dias", company: "MARITIME DEVELOPMENTS BRASIL LTDA.", isContact: true },
  { name: "Lucas Diniz", company: "IEC INSTALAÇÕES E ENGENHARIA DE CORROSÃO LTDA.", isContact: true },
  { name: "Marcos Daniel Gonzalez Rojas", company: "CADDELL CONSTRUCTION CO. (DE), LLC.", isContact: true },
  { name: "Micah Sun Rio Sneeringer", company: "CADDELL CONSTRUCTION CO. (DE), LLC.", isContact: true },
  { name: "Nicola Hartman", company: "TTL SUBSEA", isContact: true },
  { name: "Patrícia Lage", company: "SINOCHEM PETRÓLEO BRASIL LTDA.", isContact: true },
  { name: "Per Einar Nilsen", company: "DRAMMEN YARD", isContact: true },
  { name: "Roberto Oscar Fernandez", company: "TACKER BR LTDA.", isContact: true },
  { name: "Rogério Dantas", company: "DRILLTEC SERVIÇOS DE PERFURAÇÃO LTDA.", isContact: true },
  { name: "Salih Kircik", company: "CADDELL CONSTRUCTION CO. (DE), LLC.", isContact: true },
  { name: "Sarfaraz Fahmi", company: "ENKA", isContact: true },
  { name: "Suzi Oliveira", company: "IC SUPPLY ENGENHARIA LTDA.", isContact: true },
  { name: "Tiago Renovato", company: "TENNESSINE INSTRUMENTAÇÃO ANALÍTICA COMÉRCIO E SERVIÇOS LTDA.", isContact: true },
  { name: "Verbena Santos", company: "ITALSOFA NORDESTE S.A.", isContact: true },
  { name: "Wanessa Gomes", company: "CADDELL CONSTRUCTION CO. (DE), LLC.", isContact: true },
  { name: "Wang Hua", company: "SINOPEC PETROLEUM DO BRASIL LTDA.", isContact: true },
  { name: "Yuri Mendes Martins", company: "MARITIME DEVELOPMENTS BRASIL LTDA.", isContact: true },
];

export default mutation({
  args: {},
  handler: async (ctx) => {
    console.log("Starting company link fixes...");

    let linked = 0;
    let errors = 0;
    const errorDetails: Array<{ name: string; error: string }> = [];

    // Load companies
    const companies = await ctx.db.query("companies").collect();
    const companyMap = new Map<string, any>();
    companies.forEach(company => {
      companyMap.set(company.name.toLowerCase().trim(), company);
    });

    for (const link of PEOPLE_COMPANY_LINKS) {
      try {
        // Find person by name
        const person = await ctx.db
          .query("people")
          .filter((q) => q.eq(q.field("givenNames"), link.name))
          .first();

        if (!person) {
          errorDetails.push({ name: link.name, error: "Person not found" });
          errors++;
          continue;
        }

        // Find company
        const company = companyMap.get(link.company.toLowerCase().trim());
        if (!company) {
          errorDetails.push({ name: link.name, error: `Company not found: ${link.company}` });
          errors++;
          continue;
        }

        // Check if link already exists
        const existingLink = await ctx.db
          .query("peopleCompanies")
          .filter((q) =>
            q.and(
              q.eq(q.field("personId"), person._id),
              q.eq(q.field("companyId"), company._id)
            )
          )
          .first();

        if (existingLink) {
          console.log(`Link already exists for ${link.name}`);
          continue;
        }

        // Create link
        await ctx.db.insert("peopleCompanies", {
          personId: person._id,
          companyId: company._id,
          role: link.isContact ? "Contact" : "Employee",
          isCurrent: true,
        });

        linked++;
        console.log(`Linked ${link.name} to ${link.company}`);

      } catch (error) {
        errorDetails.push({
          name: link.name,
          error: error instanceof Error ? error.message : String(error),
        });
        errors++;
      }
    }

    const result = {
      linked,
      errors,
      errorDetails,
    };

    console.log("Company links fix complete!");
    console.log(JSON.stringify(result, null, 2));

    return result;
  },
});
