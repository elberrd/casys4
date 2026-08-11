type NullableName = string | null;

export type PassportNameFields = {
  givenNames: NullableName;
  middleName: NullableName;
  surname: NullableName;
  fullName: NullableName;
  fatherName: NullableName;
  motherName: NullableName;
  mrz: string | null;
};

export type PassportMrzIdentity = {
  issuingCountryCode: string | null;
  nationalityCode: string | null;
  surname: string | null;
  givenNameParts: string[];
};

const NON_DECOMPOSING_LATIN_CHARACTERS: Record<string, string> = {
  Æ: "AE",
  æ: "ae",
  Đ: "D",
  đ: "d",
  Ð: "D",
  ð: "d",
  Ħ: "H",
  ħ: "h",
  ı: "i",
  Ł: "L",
  ł: "l",
  Ŋ: "N",
  ŋ: "n",
  Ø: "O",
  ø: "o",
  Œ: "OE",
  œ: "oe",
  Þ: "TH",
  þ: "th",
  Ŧ: "T",
  ŧ: "t",
  ẞ: "SS",
  ß: "ss",
};

function hasLatinBase(value: string): boolean {
  return /\p{Script=Latin}/u.test(value);
}

/**
 * Converts Latin-script variants to the basic A-Z alphabet used by the MRZ.
 * Letters from other scripts are deliberately preserved when no MRZ spelling
 * is available, instead of attempting an unreliable general transliteration.
 */
export function latinToBasicAlphabet(value: string): string {
  let result = "";
  let previousWasLatin = false;

  for (const character of value.normalize("NFC")) {
    if (/\p{Mark}/u.test(character) && previousWasLatin) {
      continue;
    }

    const mapped = NON_DECOMPOSING_LATIN_CHARACTERS[character];
    if (mapped !== undefined) {
      result += mapped;
      previousWasLatin = true;
      continue;
    }

    if (!hasLatinBase(character)) {
      result += character;
      if (!/\p{Mark}/u.test(character)) previousWasLatin = false;
      continue;
    }

    result += character.normalize("NFD").replace(/\p{Mark}/gu, "");
    previousWasLatin = true;
  }

  return result;
}

/** Applies title case to every name component, including hyphenated names. */
export function formatPassportPersonName(value: string): string {
  const compact = latinToBasicAlphabet(value).trim().replace(/\s+/g, " ");
  if (!compact) return "";

  return compact
    .toLocaleLowerCase("pt-BR")
    .replace(/(^|[\s\-'’])(\p{L})/gu, (_, boundary: string, letter: string) => {
      return `${boundary}${letter.toLocaleUpperCase("pt-BR")}`;
    });
}

function cleanMrzLine(line: string): string {
  return line.toUpperCase().replace(/[^A-Z0-9<]/g, "");
}

function getTd3Lines(mrz: string): [string, string] | null {
  const lines = mrz.split(/\r?\n/).map(cleanMrzLine).filter(Boolean);

  for (let index = 0; index < lines.length - 1; index += 1) {
    const first = lines[index];
    const second = lines[index + 1];
    if (first.startsWith("P") && first.length >= 44 && second.length >= 44) {
      return [first.slice(0, 44), second.slice(0, 44)];
    }
  }

  // Some OCR responses flatten both 44-character rows into a single line.
  const compact = cleanMrzLine(mrz);
  const passportStart = compact.indexOf("P");
  if (passportStart >= 0 && compact.length - passportStart >= 88) {
    return [
      compact.slice(passportStart, passportStart + 44),
      compact.slice(passportStart + 44, passportStart + 88),
    ];
  }

  return null;
}

function validMrzCountryCode(value: string): string | null {
  return /^[A-Z]{3}$/.test(value) ? value : null;
}

/** Parses the identity and country fields from a two-line TD3 passport MRZ. */
export function parsePassportMrz(
  mrz: string | null,
): PassportMrzIdentity | null {
  if (!mrz) return null;

  const lines = getTd3Lines(mrz);
  if (!lines) return null;

  const [firstLine, secondLine] = lines;
  const [surnamePart = "", givenNamesPart = ""] = firstLine
    .slice(5)
    .split("<<", 2);
  const surname = surnamePart.replace(/<+/g, " ").trim() || null;
  const givenNameParts = givenNamesPart.split(/<+/).filter(Boolean);

  return {
    issuingCountryCode: validMrzCountryCode(firstLine.slice(2, 5)),
    nationalityCode: validMrzCountryCode(secondLine.slice(10, 13)),
    surname,
    givenNameParts,
  };
}

function normalizeOptionalName(value: string | null): string | null {
  if (!value) return null;
  return formatPassportPersonName(value) || null;
}

function countNameParts(value: string | null): number {
  return value?.trim().split(/\s+/).filter(Boolean).length ?? 0;
}

/**
 * Normalizes every person-name field and prefers the passport MRZ spelling for
 * the holder's given names and surname. The visual field is still used to keep
 * an explicitly separated middle name in the appropriate form field.
 */
export function normalizePassportNameFields(
  fields: PassportNameFields,
): Omit<PassportNameFields, "mrz"> {
  let givenNames = normalizeOptionalName(fields.givenNames);
  let middleName = normalizeOptionalName(fields.middleName);
  let surname = normalizeOptionalName(fields.surname);
  const mrzIdentity = parsePassportMrz(fields.mrz);

  if (mrzIdentity?.surname) {
    surname = formatPassportPersonName(mrzIdentity.surname) || surname;
  }

  if (mrzIdentity?.givenNameParts.length) {
    const mrzGivenNames = mrzIdentity.givenNameParts.map(
      formatPassportPersonName,
    );

    if (middleName && mrzGivenNames.length > 1) {
      const splitAt = Math.min(
        Math.max(countNameParts(givenNames), 1),
        mrzGivenNames.length - 1,
      );
      givenNames = mrzGivenNames.slice(0, splitAt).join(" ");
      middleName = mrzGivenNames.slice(splitAt).join(" ");
    } else {
      givenNames = mrzGivenNames.join(" ");
      middleName = null;
    }
  }

  const composedFullName = [givenNames, middleName, surname]
    .filter((part): part is string => Boolean(part))
    .join(" ");

  return {
    givenNames,
    middleName,
    surname,
    fullName: composedFullName || normalizeOptionalName(fields.fullName),
    fatherName: normalizeOptionalName(fields.fatherName),
    motherName: normalizeOptionalName(fields.motherName),
  };
}
