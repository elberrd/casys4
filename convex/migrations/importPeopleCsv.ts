import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { Id } from "../_generated/dataModel";

// Helper to parse CSV row
function parseCSVRow(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());

  return result;
}

// Helper to clean CPF
function cleanDocumentNumber(doc: string): string {
  return doc.replace(/[^\d]/g, '');
}

// Helper to validate CPF
function isValidCPF(cpf: string): boolean {
  if (!cpf || cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cpf.charAt(i)) * (10 - i);
  }
  let checkDigit = 11 - (sum % 11);
  if (checkDigit >= 10) checkDigit = 0;
  if (checkDigit !== parseInt(cpf.charAt(9))) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cpf.charAt(i)) * (11 - i);
  }
  checkDigit = 11 - (sum % 11);
  if (checkDigit >= 10) checkDigit = 0;
  if (checkDigit !== parseInt(cpf.charAt(10))) return false;

  return true;
}

// Helper to convert date from DD/MM/YYYY to YYYY-MM-DD
function convertDateToISO(dateStr: string): string | undefined {
  if (!dateStr || dateStr.trim() === '') return undefined;

  const parts = dateStr.split('/');
  if (parts.length !== 3) return undefined;

  const [day, month, year] = parts;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

// Helper to check if row is test data
function isTestData(name: string): boolean {
  const lowerName = name.toLowerCase();
  return (
    lowerName.includes('teste') ||
    lowerName.includes('test') ||
    /^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(name) || // CPF format
    /^[A-Z]\d{7}$/.test(name) // Passport format
  );
}

// Marital status mapping
const MARITAL_STATUS_MAP: Record<string, string> = {
  'Solteiro(a)': 'Single',
  'Casado(a)': 'Married',
  'Divorciado(a)': 'Divorced',
  'Viúvo(a)': 'Widowed',
};

// Nationality mapping (Portuguese to English)
const NATIONALITY_MAP: Record<string, string> = {
  'Reino Unido': 'United Kingdom',
  'Turquia': 'Turkey',
  'Estados Unidos': 'United States',
  'Índia': 'India',
  'Filipinas': 'Philippines',
  'Alemanha': 'Germany',
  'México': 'Mexico',
  'Colômbia': 'Colombia',
  'Paraguai': 'Paraguay',
  'Paquistão': 'Pakistan',
  'Romênia': 'Romania',
  'Noruega': 'Norway',
  'Holanda': 'Netherlands',
  'Canadá': 'Canada',
  'China': 'China',
  'Singapura': 'Singapore',
  'Argentina': 'Argentina',
  'França': 'France',
  'Dinamarca': 'Denmark',
  'Coreia do Sul': 'South Korea',
  'Itália': 'Italy',
  'Indonésia': 'Indonesia',
  'Japão': 'Japan',
  'Polônia': 'Poland',
  'Austrália': 'Australia',
  'Malásia': 'Malaysia',
  'Suécia': 'Sweden',
};

interface ImportStats {
  totalRows: number;
  skippedTest: number;
  skippedDuplicateCPF: number;
  skippedInvalidData: number;
  peopleCreated: number;
  citiesCreated: number;
  passportsCreated: number;
  companyLinksCreated: number;
  unmappedNationalities: Set<string>;
  unmappedCompanies: Set<string>;
  errors: Array<{ row: number; name: string; error: string }>;
}

export default mutation({
  args: {
    csvContent: v.string(),
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { csvContent, dryRun = false } = args;

    const stats: ImportStats = {
      totalRows: 0,
      skippedTest: 0,
      skippedDuplicateCPF: 0,
      skippedInvalidData: 0,
      peopleCreated: 0,
      citiesCreated: 0,
      passportsCreated: 0,
      companyLinksCreated: 0,
      unmappedNationalities: new Set(),
      unmappedCompanies: new Set(),
      errors: [],
    };

    // Phase 1: Load existing data
    console.log("Phase 1: Loading existing data...");

    const countries = await ctx.db.query("countries").collect();
    const countryMap = new Map<string, Id<"countries">>();
    countries.forEach(country => {
      countryMap.set(country.name.toLowerCase(), country._id);
    });

    const companies = await ctx.db.query("companies").collect();
    const companyMap = new Map<string, Id<"companies">>();
    companies.forEach(company => {
      const normalizedName = company.name.toLowerCase().trim();
      companyMap.set(normalizedName, company._id);
    });

    const existingCities = await ctx.db.query("cities").collect();
    const cityMap = new Map<string, Id<"cities">>();
    existingCities.forEach(city => {
      cityMap.set(city.name.toLowerCase().trim(), city._id);
    });

    const existingPeople = await ctx.db.query("people").collect();
    const cpfSet = new Set<string>();
    existingPeople.forEach(person => {
      if (person.cpf) {
        cpfSet.add(person.cpf);
      }
    });

    // Parse CSV
    const lines = csvContent.split('\n').filter(line => line.trim());
    const headers = parseCSVRow(lines[0]);

    // Find column indices
    const colMap: Record<string, number> = {};
    headers.forEach((header, index) => {
      colMap[header.trim()] = index;
    });

    // Phase 2: Extract and create cities
    console.log("Phase 2: Processing cities...");
    const uniqueCities = new Set<string>();
    const cityToCountry = new Map<string, string>();

    for (let i = 1; i < lines.length; i++) {
      const row = parseCSVRow(lines[i]);
      const cityName = row[colMap['Cidade de Nascimento']]?.trim();
      const nationality = row[colMap['Nacionalidade']]?.trim();

      if (cityName && !isTestData(row[colMap['Nome']])) {
        uniqueCities.add(cityName);
        if (nationality) {
          cityToCountry.set(cityName, nationality);
        }
      }
    }

    // Create missing cities
    for (const cityName of uniqueCities) {
      const cityKey = cityName.toLowerCase().trim();
      if (!cityMap.has(cityKey) && !dryRun) {
        let countryId: Id<"countries"> | undefined;

        // Try to get country from nationality
        const nationalityPt = cityToCountry.get(cityName);
        if (nationalityPt) {
          const countryNameEn = NATIONALITY_MAP[nationalityPt];
          if (countryNameEn) {
            countryId = countryMap.get(countryNameEn.toLowerCase());
          }
        }

        const newCityId = await ctx.db.insert("cities", {
          name: cityName,
          countryId,
          hasFederalPolice: false,
        });

        cityMap.set(cityKey, newCityId);
        stats.citiesCreated++;
      }
    }

    // Phase 3: Process people
    console.log("Phase 3: Processing people...");

    for (let i = 1; i < lines.length; i++) {
      stats.totalRows++;
      const row = parseCSVRow(lines[i]);

      const givenNames = row[colMap['Nome']]?.trim();
      if (!givenNames) {
        stats.skippedInvalidData++;
        continue;
      }

      // Skip test data
      if (isTestData(givenNames)) {
        stats.skippedTest++;
        continue;
      }

      try {
        // Extract and clean data
        const isContact = row[colMap['Contato']]?.trim().toUpperCase() === 'TRUE';
        const email = row[colMap['Email']]?.trim() || undefined;
        const rawCPF = row[colMap['CPF']]?.trim();
        const cpf = rawCPF ? cleanDocumentNumber(rawCPF) : undefined;
        const birthDateStr = row[colMap['Data de Nascimento']]?.trim();
        const birthDate = convertDateToISO(birthDateStr);
        const birthCityName = row[colMap['Cidade de Nascimento']]?.trim();
        const nationalityPt = row[colMap['Nacionalidade']]?.trim();
        const passportsStr = row[colMap['Passaportes']]?.trim();
        const profession = row[colMap['Profissão']]?.trim() || undefined;
        const maritalStatusPt = row[colMap['Estado civil']]?.trim();
        const motherName = row[colMap['Mãe']]?.trim() || undefined;
        const fatherName = row[colMap['Pai']]?.trim() || undefined;
        const companyName = row[colMap['Empresas']]?.trim();

        // Validate and check CPF
        if (cpf) {
          if (!isValidCPF(cpf)) {
            stats.errors.push({
              row: i + 1,
              name: givenNames,
              error: `Invalid CPF: ${rawCPF}`,
            });
            stats.skippedInvalidData++;
            continue;
          }

          if (cpfSet.has(cpf)) {
            stats.skippedDuplicateCPF++;
            continue;
          }
        }

        // Map nationality
        let nationalityId: Id<"countries"> | undefined;
        if (nationalityPt) {
          const countryNameEn = NATIONALITY_MAP[nationalityPt];
          if (countryNameEn) {
            nationalityId = countryMap.get(countryNameEn.toLowerCase());
          }
          if (!nationalityId) {
            stats.unmappedNationalities.add(nationalityPt);
          }
        }

        // Map birth city
        let birthCityId: Id<"cities"> | undefined;
        if (birthCityName) {
          birthCityId = cityMap.get(birthCityName.toLowerCase().trim());
        }

        // Map marital status
        const maritalStatus = maritalStatusPt ? MARITAL_STATUS_MAP[maritalStatusPt] : undefined;

        if (dryRun) {
          stats.peopleCreated++;
          continue;
        }

        // Create person
        const personId = await ctx.db.insert("people", {
          givenNames,
          email,
          cpf,
          birthDate,
          birthCityId,
          nationalityId,
          maritalStatus,
          profession,
          motherName,
          fatherName,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        stats.peopleCreated++;
        if (cpf) cpfSet.add(cpf);

        // Create passports
        if (passportsStr) {
          const passportNumbers = passportsStr.split(',').map(p => p.trim()).filter(p => p);
          for (let j = 0; j < passportNumbers.length; j++) {
            const passportNumber = passportNumbers[j];
            await ctx.db.insert("passports", {
              passportNumber,
              personId,
              issuingCountryId: nationalityId,
              isActive: j === 0, // First passport is active
              createdAt: Date.now(),
              updatedAt: Date.now(),
            });
            stats.passportsCreated++;
          }
        }

        // Link to company
        if (companyName) {
          const companyId = companyMap.get(companyName.toLowerCase().trim());
          if (companyId) {
            await ctx.db.insert("peopleCompanies", {
              personId,
              companyId,
              role: isContact ? "Contact" : "Employee",
              isCurrent: true,
            });
            stats.companyLinksCreated++;
          } else {
            stats.unmappedCompanies.add(companyName);
          }
        }

      } catch (error) {
        stats.errors.push({
          row: i + 1,
          name: givenNames,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // Generate report
    const report = {
      summary: {
        totalRows: stats.totalRows,
        peopleCreated: stats.peopleCreated,
        citiesCreated: stats.citiesCreated,
        passportsCreated: stats.passportsCreated,
        companyLinksCreated: stats.companyLinksCreated,
      },
      skipped: {
        testData: stats.skippedTest,
        duplicateCPF: stats.skippedDuplicateCPF,
        invalidData: stats.skippedInvalidData,
      },
      warnings: {
        unmappedNationalities: Array.from(stats.unmappedNationalities),
        unmappedCompanies: Array.from(stats.unmappedCompanies),
      },
      errors: stats.errors,
      dryRun,
    };

    console.log("Import complete!");
    console.log(JSON.stringify(report, null, 2));

    return report;
  },
});
