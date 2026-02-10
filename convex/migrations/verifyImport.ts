import { internalQuery } from "../_generated/server";

export default internalQuery({
  args: {},
  handler: async (ctx) => {
    // Count all records
    const people = await ctx.db.query("people").collect();
    const passports = await ctx.db.query("passports").collect();
    const peopleCompanies = await ctx.db.query("peopleCompanies").collect();
    const cities = await ctx.db.query("cities").collect();

    // Get sample people
    const samples = people.slice(0, 5).map(person => ({
      givenNames: person.givenNames,
      email: person.email,
      cpf: person.cpf,
      birthDate: person.birthDate,
      hasNationality: !!person.nationalityId,
      hasBirthCity: !!person.birthCityId,
      maritalStatus: person.maritalStatus,
      profession: person.profession,
    }));

    // Count people with passports
    const peopleWithPassports = new Set(passports.map(p => p.personId)).size;

    // Count people with companies
    const peopleWithCompanies = new Set(peopleCompanies.map(pc => pc.personId)).size;

    const report = {
      counts: {
        totalPeople: people.length,
        totalPassports: passports.length,
        totalCompanyLinks: peopleCompanies.length,
        totalCities: cities.length,
        peopleWithPassports,
        peopleWithCompanies,
      },
      samplePeople: samples,
      statistics: {
        peopleWithEmail: people.filter(p => p.email).length,
        peopleWithCPF: people.filter(p => p.cpf).length,
        peopleWithBirthDate: people.filter(p => p.birthDate).length,
        peopleWithNationality: people.filter(p => p.nationalityId).length,
        peopleWithBirthCity: people.filter(p => p.birthCityId).length,
        peopleWithMaritalStatus: people.filter(p => p.maritalStatus).length,
        peopleWithProfession: people.filter(p => p.profession).length,
      },
    };

    console.log("=== IMPORT VERIFICATION REPORT ===");
    console.log(JSON.stringify(report, null, 2));

    return report;
  },
});
