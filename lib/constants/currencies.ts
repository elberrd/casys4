export interface CurrencyInfo {
  code: string; // ISO 4217 code
  symbol: string;
  name: string;
  nameEn: string;
  namePt: string;
}

export interface CountryCurrencyMapping {
  countryCode: string;
  countryName: string;
  countryNameEn: string;
  countryNamePt: string;
  currency: CurrencyInfo;
}

export const COUNTRY_CURRENCY_MAPPINGS: CountryCurrencyMapping[] = [
  // Major currencies (defaults at top)
  {
    countryCode: "US",
    countryName: "United States",
    countryNameEn: "United States",
    countryNamePt: "Estados Unidos",
    currency: {
      code: "USD",
      symbol: "$",
      name: "US Dollar",
      nameEn: "US Dollar",
      namePt: "Dólar Americano",
    },
  },
  {
    countryCode: "BR",
    countryName: "Brazil",
    countryNameEn: "Brazil",
    countryNamePt: "Brasil",
    currency: {
      code: "BRL",
      symbol: "R$",
      name: "Brazilian Real",
      nameEn: "Brazilian Real",
      namePt: "Real Brasileiro",
    },
  },
  {
    countryCode: "EU",
    countryName: "European Union",
    countryNameEn: "European Union",
    countryNamePt: "União Europeia",
    currency: {
      code: "EUR",
      symbol: "€",
      name: "Euro",
      nameEn: "Euro",
      namePt: "Euro",
    },
  },
  {
    countryCode: "GB",
    countryName: "United Kingdom",
    countryNameEn: "United Kingdom",
    countryNamePt: "Reino Unido",
    currency: {
      code: "GBP",
      symbol: "£",
      name: "British Pound",
      nameEn: "British Pound",
      namePt: "Libra Esterlina",
    },
  },
  {
    countryCode: "JP",
    countryName: "Japan",
    countryNameEn: "Japan",
    countryNamePt: "Japão",
    currency: {
      code: "JPY",
      symbol: "¥",
      name: "Japanese Yen",
      nameEn: "Japanese Yen",
      namePt: "Iene Japonês",
    },
  },
  {
    countryCode: "CA",
    countryName: "Canada",
    countryNameEn: "Canada",
    countryNamePt: "Canadá",
    currency: {
      code: "CAD",
      symbol: "C$",
      name: "Canadian Dollar",
      nameEn: "Canadian Dollar",
      namePt: "Dólar Canadense",
    },
  },
  {
    countryCode: "AU",
    countryName: "Australia",
    countryNameEn: "Australia",
    countryNamePt: "Austrália",
    currency: {
      code: "AUD",
      symbol: "A$",
      name: "Australian Dollar",
      nameEn: "Australian Dollar",
      namePt: "Dólar Australiano",
    },
  },
  {
    countryCode: "CH",
    countryName: "Switzerland",
    countryNameEn: "Switzerland",
    countryNamePt: "Suíça",
    currency: {
      code: "CHF",
      symbol: "CHF",
      name: "Swiss Franc",
      nameEn: "Swiss Franc",
      namePt: "Franco Suíço",
    },
  },
  {
    countryCode: "CN",
    countryName: "China",
    countryNameEn: "China",
    countryNamePt: "China",
    currency: {
      code: "CNY",
      symbol: "¥",
      name: "Chinese Yuan",
      nameEn: "Chinese Yuan",
      namePt: "Yuan Chinês",
    },
  },
  {
    countryCode: "MX",
    countryName: "Mexico",
    countryNameEn: "Mexico",
    countryNamePt: "México",
    currency: {
      code: "MXN",
      symbol: "$",
      name: "Mexican Peso",
      nameEn: "Mexican Peso",
      namePt: "Peso Mexicano",
    },
  },
  // Additional currencies
  {
    countryCode: "AR",
    countryName: "Argentina",
    countryNameEn: "Argentina",
    countryNamePt: "Argentina",
    currency: {
      code: "ARS",
      symbol: "$",
      name: "Argentine Peso",
      nameEn: "Argentine Peso",
      namePt: "Peso Argentino",
    },
  },
  {
    countryCode: "IN",
    countryName: "India",
    countryNameEn: "India",
    countryNamePt: "Índia",
    currency: {
      code: "INR",
      symbol: "₹",
      name: "Indian Rupee",
      nameEn: "Indian Rupee",
      namePt: "Rúpia Indiana",
    },
  },
  {
    countryCode: "KR",
    countryName: "South Korea",
    countryNameEn: "South Korea",
    countryNamePt: "Coreia do Sul",
    currency: {
      code: "KRW",
      symbol: "₩",
      name: "South Korean Won",
      nameEn: "South Korean Won",
      namePt: "Won Sul-Coreano",
    },
  },
  {
    countryCode: "SG",
    countryName: "Singapore",
    countryNameEn: "Singapore",
    countryNamePt: "Singapura",
    currency: {
      code: "SGD",
      symbol: "S$",
      name: "Singapore Dollar",
      nameEn: "Singapore Dollar",
      namePt: "Dólar de Singapura",
    },
  },
  {
    countryCode: "NZ",
    countryName: "New Zealand",
    countryNameEn: "New Zealand",
    countryNamePt: "Nova Zelândia",
    currency: {
      code: "NZD",
      symbol: "NZ$",
      name: "New Zealand Dollar",
      nameEn: "New Zealand Dollar",
      namePt: "Dólar Neozelandês",
    },
  },
  {
    countryCode: "HK",
    countryName: "Hong Kong",
    countryNameEn: "Hong Kong",
    countryNamePt: "Hong Kong",
    currency: {
      code: "HKD",
      symbol: "HK$",
      name: "Hong Kong Dollar",
      nameEn: "Hong Kong Dollar",
      namePt: "Dólar de Hong Kong",
    },
  },
  {
    countryCode: "NO",
    countryName: "Norway",
    countryNameEn: "Norway",
    countryNamePt: "Noruega",
    currency: {
      code: "NOK",
      symbol: "kr",
      name: "Norwegian Krone",
      nameEn: "Norwegian Krone",
      namePt: "Coroa Norueguesa",
    },
  },
  {
    countryCode: "SE",
    countryName: "Sweden",
    countryNameEn: "Sweden",
    countryNamePt: "Suécia",
    currency: {
      code: "SEK",
      symbol: "kr",
      name: "Swedish Krona",
      nameEn: "Swedish Krona",
      namePt: "Coroa Sueca",
    },
  },
  {
    countryCode: "DK",
    countryName: "Denmark",
    countryNameEn: "Denmark",
    countryNamePt: "Dinamarca",
    currency: {
      code: "DKK",
      symbol: "kr",
      name: "Danish Krone",
      nameEn: "Danish Krone",
      namePt: "Coroa Dinamarquesa",
    },
  },
  {
    countryCode: "PL",
    countryName: "Poland",
    countryNameEn: "Poland",
    countryNamePt: "Polônia",
    currency: {
      code: "PLN",
      symbol: "zł",
      name: "Polish Zloty",
      nameEn: "Polish Zloty",
      namePt: "Zloty Polonês",
    },
  },
  {
    countryCode: "TH",
    countryName: "Thailand",
    countryNameEn: "Thailand",
    countryNamePt: "Tailândia",
    currency: {
      code: "THB",
      symbol: "฿",
      name: "Thai Baht",
      nameEn: "Thai Baht",
      namePt: "Baht Tailandês",
    },
  },
  {
    countryCode: "MY",
    countryName: "Malaysia",
    countryNameEn: "Malaysia",
    countryNamePt: "Malásia",
    currency: {
      code: "MYR",
      symbol: "RM",
      name: "Malaysian Ringgit",
      nameEn: "Malaysian Ringgit",
      namePt: "Ringgit Malaio",
    },
  },
  {
    countryCode: "ID",
    countryName: "Indonesia",
    countryNameEn: "Indonesia",
    countryNamePt: "Indonésia",
    currency: {
      code: "IDR",
      symbol: "Rp",
      name: "Indonesian Rupiah",
      nameEn: "Indonesian Rupiah",
      namePt: "Rupia Indonésia",
    },
  },
  {
    countryCode: "PH",
    countryName: "Philippines",
    countryNameEn: "Philippines",
    countryNamePt: "Filipinas",
    currency: {
      code: "PHP",
      symbol: "₱",
      name: "Philippine Peso",
      nameEn: "Philippine Peso",
      namePt: "Peso Filipino",
    },
  },
  {
    countryCode: "TR",
    countryName: "Turkey",
    countryNameEn: "Turkey",
    countryNamePt: "Turquia",
    currency: {
      code: "TRY",
      symbol: "₺",
      name: "Turkish Lira",
      nameEn: "Turkish Lira",
      namePt: "Lira Turca",
    },
  },
  {
    countryCode: "RU",
    countryName: "Russia",
    countryNameEn: "Russia",
    countryNamePt: "Rússia",
    currency: {
      code: "RUB",
      symbol: "₽",
      name: "Russian Ruble",
      nameEn: "Russian Ruble",
      namePt: "Rublo Russo",
    },
  },
  {
    countryCode: "ZA",
    countryName: "South Africa",
    countryNameEn: "South Africa",
    countryNamePt: "África do Sul",
    currency: {
      code: "ZAR",
      symbol: "R",
      name: "South African Rand",
      nameEn: "South African Rand",
      namePt: "Rand Sul-Africano",
    },
  },
  {
    countryCode: "IL",
    countryName: "Israel",
    countryNameEn: "Israel",
    countryNamePt: "Israel",
    currency: {
      code: "ILS",
      symbol: "₪",
      name: "Israeli New Shekel",
      nameEn: "Israeli New Shekel",
      namePt: "Novo Shekel Israelense",
    },
  },
  {
    countryCode: "AE",
    countryName: "United Arab Emirates",
    countryNameEn: "United Arab Emirates",
    countryNamePt: "Emirados Árabes Unidos",
    currency: {
      code: "AED",
      symbol: "د.إ",
      name: "UAE Dirham",
      nameEn: "UAE Dirham",
      namePt: "Dirham dos Emirados",
    },
  },
  {
    countryCode: "SA",
    countryName: "Saudi Arabia",
    countryNameEn: "Saudi Arabia",
    countryNamePt: "Arábia Saudita",
    currency: {
      code: "SAR",
      symbol: "﷼",
      name: "Saudi Riyal",
      nameEn: "Saudi Riyal",
      namePt: "Riyal Saudita",
    },
  },
  {
    countryCode: "CL",
    countryName: "Chile",
    countryNameEn: "Chile",
    countryNamePt: "Chile",
    currency: {
      code: "CLP",
      symbol: "$",
      name: "Chilean Peso",
      nameEn: "Chilean Peso",
      namePt: "Peso Chileno",
    },
  },
  {
    countryCode: "CO",
    countryName: "Colombia",
    countryNameEn: "Colombia",
    countryNamePt: "Colômbia",
    currency: {
      code: "COP",
      symbol: "$",
      name: "Colombian Peso",
      nameEn: "Colombian Peso",
      namePt: "Peso Colombiano",
    },
  },
  {
    countryCode: "PE",
    countryName: "Peru",
    countryNameEn: "Peru",
    countryNamePt: "Peru",
    currency: {
      code: "PEN",
      symbol: "S/",
      name: "Peruvian Sol",
      nameEn: "Peruvian Sol",
      namePt: "Sol Peruano",
    },
  },
  {
    countryCode: "CZ",
    countryName: "Czech Republic",
    countryNameEn: "Czech Republic",
    countryNamePt: "República Tcheca",
    currency: {
      code: "CZK",
      symbol: "Kč",
      name: "Czech Koruna",
      nameEn: "Czech Koruna",
      namePt: "Coroa Tcheca",
    },
  },
  {
    countryCode: "HU",
    countryName: "Hungary",
    countryNameEn: "Hungary",
    countryNamePt: "Hungria",
    currency: {
      code: "HUF",
      symbol: "Ft",
      name: "Hungarian Forint",
      nameEn: "Hungarian Forint",
      namePt: "Forint Húngaro",
    },
  },
  {
    countryCode: "RO",
    countryName: "Romania",
    countryNameEn: "Romania",
    countryNamePt: "Romênia",
    currency: {
      code: "RON",
      symbol: "lei",
      name: "Romanian Leu",
      nameEn: "Romanian Leu",
      namePt: "Leu Romeno",
    },
  },
  {
    countryCode: "EG",
    countryName: "Egypt",
    countryNameEn: "Egypt",
    countryNamePt: "Egito",
    currency: {
      code: "EGP",
      symbol: "£",
      name: "Egyptian Pound",
      nameEn: "Egyptian Pound",
      namePt: "Libra Egípcia",
    },
  },
  {
    countryCode: "NG",
    countryName: "Nigeria",
    countryNameEn: "Nigeria",
    countryNamePt: "Nigéria",
    currency: {
      code: "NGN",
      symbol: "₦",
      name: "Nigerian Naira",
      nameEn: "Nigerian Naira",
      namePt: "Naira Nigeriana",
    },
  },
  {
    countryCode: "VN",
    countryName: "Vietnam",
    countryNameEn: "Vietnam",
    countryNamePt: "Vietnã",
    currency: {
      code: "VND",
      symbol: "₫",
      name: "Vietnamese Dong",
      nameEn: "Vietnamese Dong",
      namePt: "Dong Vietnamita",
    },
  },
  {
    countryCode: "BD",
    countryName: "Bangladesh",
    countryNameEn: "Bangladesh",
    countryNamePt: "Bangladesh",
    currency: {
      code: "BDT",
      symbol: "৳",
      name: "Bangladeshi Taka",
      nameEn: "Bangladeshi Taka",
      namePt: "Taka de Bangladesh",
    },
  },
  {
    countryCode: "PK",
    countryName: "Pakistan",
    countryNameEn: "Pakistan",
    countryNamePt: "Paquistão",
    currency: {
      code: "PKR",
      symbol: "₨",
      name: "Pakistani Rupee",
      nameEn: "Pakistani Rupee",
      namePt: "Rúpia Paquistanesa",
    },
  },
];

export function getCurrencyByCountryCode(
  countryCode: string
): CurrencyInfo | undefined {
  return COUNTRY_CURRENCY_MAPPINGS.find((m) => m.countryCode === countryCode)
    ?.currency;
}

export function getCountryCurrencyOptions(locale: string = "en") {
  return COUNTRY_CURRENCY_MAPPINGS.map((mapping) => ({
    value: mapping.currency.code,
    label: `${locale === "pt" ? mapping.countryNamePt : mapping.countryNameEn} (${mapping.currency.code})`,
    currency: mapping.currency,
    countryCode: mapping.countryCode,
  }));
}

export function getCurrencySymbol(currencyCode: string): string {
  const mapping = COUNTRY_CURRENCY_MAPPINGS.find((m) => m.currency.code === currencyCode);
  return mapping?.currency.symbol || currencyCode;
}

export function getCurrencyInfo(currencyCode: string): CurrencyInfo | undefined {
  return COUNTRY_CURRENCY_MAPPINGS.find((m) => m.currency.code === currencyCode)?.currency;
}
