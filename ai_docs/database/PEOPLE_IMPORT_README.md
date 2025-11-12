# People CSV Import Documentation

## Overview
This document describes how to import people from the CSV file `ai_docs/database/people.csv` into the Convex database.

## Files Created
- `convex/migrations/importPeopleCsv.ts` - Main import logic
- `scripts/importPeople.ts` - Helper script to run the import

## Import Process

### Phase 1: Data Preparation
The script:
1. Loads all existing countries, companies, cities, and people from the database
2. Creates mapping dictionaries for:
   - Portuguese → English marital status
   - Portuguese → English nationality (country names)
   - Company names → Company IDs
   - City names → City IDs

### Phase 2: City Creation
- Extracts all unique birth cities from the CSV
- Checks against existing cities to avoid duplicates
- Creates new city records for cities that don't exist
- Infers the country from the person's nationality when possible

### Phase 3: Person Import
For each valid row in the CSV:
1. **Validation:**
   - Skips test data (names containing "Teste", "Test", or CPF/passport-like names)
   - Validates CPF format using check digits
   - Checks for duplicate CPFs (skips if exists)

2. **Data Transformation:**
   - Converts birth date from DD/MM/YYYY to YYYY-MM-DD ISO format
   - Maps marital status from Portuguese to English
   - Maps nationality from Portuguese country name to Country ID
   - Cleans CPF format (removes dots and dashes)

3. **Person Creation:**
   - Creates person record with all mapped fields
   - Sets nationality to null if Portuguese name can't be mapped

4. **Passport Creation:**
   - Parses comma-separated passport numbers
   - Creates individual passport records
   - Sets first passport as active, others as inactive
   - Uses person's nationality as issuing country

5. **Company Linking:**
   - Matches company name from CSV to existing companies
   - Creates peopleCompanies relationship if match found
   - Sets role as "Contact" if Contato=TRUE, otherwise "Employee"
   - Skips company link if no match found

## Data Mappings

### Marital Status (Portuguese → English)
- `Solteiro(a)` → `Single`
- `Casado(a)` → `Married`
- `Divorciado(a)` → `Divorced`
- `Viúvo(a)` → `Widowed`

### Nationality (Portuguese → English)
- `Reino Unido` → `United Kingdom`
- `Turquia` → `Turkey`
- `Estados Unidos` → `United States`
- `Índia` → `India`
- `Filipinas` → `Philippines`
- `Alemanha` → `Germany`
- `México` → `Mexico`
- `Colômbia` → `Colombia`
- `Paraguai` → `Paraguay`
- And many more... (see script for full list)

### CSV Column Mapping
- **Contato** → Boolean flag for contact person
- **Nome** → fullName
- **Empresas** → Company relationship
- **Email** → email
- **Data de Nascimento** → birthDate (converted to ISO format)
- **Cidade de Nascimento** → birthCityId (created if needed)
- **Nacionalidade** → nationalityId (mapped from Portuguese)
- **CPF** → cpf (cleaned and validated)
- **Passaportes** → Multiple passport records (comma-separated)
- **Profissão** → profession
- **Estado civil** → maritalStatus (mapped from Portuguese)
- **Mãe** → motherName
- **Pai** → fatherName

## Error Handling

### Critical Errors (Row Skipped)
- Missing fullName (required field)
- Invalid CPF format
- Duplicate CPF (already in database)
- Test data (names like "Teste", "Test", etc.)

### Non-Critical Warnings (Logged)
- Nationality not found → Set to null, continue
- Company not found → Skip company link, continue
- Invalid date format → Set birthDate to null, continue
- Empty marital status → Set to null, continue

## Usage

### Dry Run (Recommended First)
```bash
npm run tsx scripts/importPeople.ts --dry-run
```

This will:
- Validate all data
- Show what would be imported
- Display warnings and errors
- **NOT make any database changes**

### Live Import
```bash
npm run tsx scripts/importPeople.ts
```

This will:
- Actually import the data into the database
- Create people, cities, passports, and company relationships
- Display final import report

## Import Report

After running the import, you'll see a detailed report with:

### Summary
- Total rows processed
- People created
- Cities created
- Passports created
- Company links created

### Skipped
- Test data rows
- Duplicate CPF rows
- Invalid data rows

### Warnings
- Unmapped nationalities (list of Portuguese names not found)
- Unmapped companies (list of company names not found)

### Errors
- Row-by-row error details with row number, name, and error message

## Expected Results

From the CSV with 573 rows:
- **Valid people:** ~560 (excluding test data and duplicates)
- **New cities:** ~100-150 (unique birth cities not in database)
- **Passports:** ~600-700 (some people have multiple passports)
- **Company links:** ~50-100 (only for people with matched companies)

## Troubleshooting

### "Invalid CPF" errors
- CPF must be 11 digits and pass check digit validation
- Invalid CPFs are skipped automatically

### "Unmapped nationality" warnings
- Add missing Portuguese → English mapping to `NATIONALITY_MAP` in the script
- Or accept that nationality will be set to null

### "Unmapped company" warnings
- Check company name spelling in CSV vs database
- Add company to database first if needed
- Or accept that company link will be skipped

### Import fails with timeout
- The script processes all rows in one transaction
- For very large files, consider batching (split CSV into smaller files)

## Notes

1. **CPF Duplicates:** If a CPF already exists in the database, that person is skipped entirely
2. **City Duplicates:** City names are compared case-insensitively to avoid duplicates
3. **Company Matching:** Company names are matched case-insensitively after trimming
4. **Passport Activation:** Only the first passport for each person is marked as active
5. **Test Data:** Automatically skips rows with test-like names to keep database clean

## Rollback

If you need to rollback the import:
1. Note the timestamp when you started the import
2. Query people created after that timestamp
3. Delete related records (passports, peopleCompanies)
4. Delete the people records
5. Delete cities created during import (if needed)

There's no automatic rollback mechanism, so it's recommended to:
- Always run dry-run first
- Test with a small subset of data
- Backup database before large imports (if possible)
