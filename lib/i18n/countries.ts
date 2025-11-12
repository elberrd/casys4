import { useTranslations } from 'next-intl';

/**
 * Type for country codes (ISO 2-letter codes)
 */
export type CountryCode = string;

/**
 * Hook to get translated country name by country code
 *
 * @example
 * ```tsx
 * const getCountryName = useCountryTranslation();
 * const name = getCountryName('BR'); // Returns "Brasil" in PT or "Brazil" in EN
 * ```
 *
 * @returns A function that takes a country code and returns the translated name
 */
export function useCountryTranslation() {
  const t = useTranslations('Countries.names');

  return (countryCode: CountryCode | undefined): string => {
    if (!countryCode) return '';

    try {
      // Try to get the translation, fall back to country code if not found
      return t(countryCode) || countryCode;
    } catch {
      // If translation key doesn't exist, return the code
      return countryCode;
    }
  };
}

/**
 * Hook to get translated country names for a list of countries
 *
 * @example
 * ```tsx
 * const translateCountries = useCountriesTranslation();
 * const translatedList = translateCountries(countries);
 * // Each item now has a 'translatedName' property
 * ```
 *
 * @returns A function that enriches country objects with translated names
 */
export function useCountriesTranslation() {
  const getCountryName = useCountryTranslation();

  return <T extends { _id: string; code: string; name: string }>(
    countries: T[]
  ): Array<T & { translatedName: string }> => {
    return countries.map(country => ({
      ...country,
      translatedName: getCountryName(country.code) || country.name
    }));
  };
}

/**
 * Hook to search countries by translated name (accent-insensitive)
 *
 * @example
 * ```tsx
 * const searchCountries = useCountrySearch();
 * const results = searchCountries(allCountries, 'brasil');
 * // Returns countries matching "Brasil" or "Brazil" depending on locale
 * ```
 */
export function useCountrySearch() {
  const getCountryName = useCountryTranslation();

  return <T extends { code: string; name: string }>(
    countries: T[],
    searchTerm: string
  ): T[] => {
    if (!searchTerm) return countries;

    const normalizeString = (str: string): string => {
      return str
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, ''); // Remove accents
    };

    const normalized = normalizeString(searchTerm);

    return countries.filter(country => {
      const translatedName = getCountryName(country.code);
      const matchesTranslated = normalizeString(translatedName).includes(normalized);
      const matchesOriginal = normalizeString(country.name).includes(normalized);

      return matchesTranslated || matchesOriginal;
    });
  };
}
