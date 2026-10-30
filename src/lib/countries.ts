export type Country = { code: string; name: string };
export const DEFAULT_COUNTRY = "br";

const OTHER_COUNTRIES: Country[] = [
  { code: "ar", name: "Argentina" },
  { code: "uy", name: "Uruguai" },
  { code: "py", name: "Paraguai" },
  { code: "cl", name: "Chile" },
  { code: "co", name: "Colômbia" },
  { code: "pt", name: "Portugal" },
  { code: "es", name: "Espanha" },
  { code: "fr", name: "França" },
  { code: "it", name: "Itália" },
  { code: "de", name: "Alemanha" },
  { code: "us", name: "Estados Unidos" },
].sort((a, b) => a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" }));

export const COUNTRIES: Country[] = [
  { code: "br", name: "Brasil" },
  ...OTHER_COUNTRIES,
];

const KNOWN_CODES = new Set(COUNTRIES.map((country) => country.code));

export function flagUrl(code: string): string {
  const normalized = code.toLowerCase();
  const safeCode = KNOWN_CODES.has(normalized) ? normalized : DEFAULT_COUNTRY;
  return `${import.meta.env.BASE_URL}flags/${safeCode}.svg`;
}
