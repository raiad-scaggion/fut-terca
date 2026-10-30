export type Club = { id: string; name: string; file: string };

export const CLUBS: Club[] = [
  { id: "athletico", name: "Athletico-PR", file: "athletico.svg" },
  { id: "atletico-mg", name: "Atlético-MG", file: "atletico-mg.svg" },
  { id: "bahia", name: "Bahia", file: "bahia.svg" },
  { id: "botafogo", name: "Botafogo", file: "botafogo.svg" },
  { id: "bragantino", name: "Bragantino", file: "bragantino.png" },
  { id: "chapecoense", name: "Chapecoense", file: "chapecoense.svg" },
  { id: "corinthians", name: "Corinthians", file: "corinthians.png" },
  { id: "coritiba", name: "Coritiba", file: "coritiba.svg" },
  { id: "cruzeiro", name: "Cruzeiro", file: "cruzeiro.svg" },
  { id: "ferroviaria", name: "Ferroviária", file: "ferroviaria.svg" },
  { id: "flamengo", name: "Flamengo", file: "flamengo.svg" },
  { id: "fluminense", name: "Fluminense", file: "fluminense.svg" },
  { id: "gremio", name: "Grêmio", file: "gremio.svg" },
  { id: "internacional", name: "Internacional", file: "internacional.svg" },
  { id: "mirassol", name: "Mirassol", file: "mirassol.png" },
  { id: "palmeiras", name: "Palmeiras", file: "palmeiras.svg" },
  { id: "remo", name: "Remo", file: "remo.svg" },
  { id: "santos", name: "Santos", file: "santos.png" },
  { id: "sao-paulo", name: "São Paulo", file: "sao-paulo.svg" },
  { id: "vasco", name: "Vasco", file: "vasco.svg" },
  { id: "vitoria", name: "Vitória", file: "vitoria.svg" },
].sort((a, b) => a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" }));

const BY_ID = new Map(CLUBS.map((club) => [club.id, club]));

export function getClub(id: string): Club | undefined {
  return BY_ID.get(id);
}

export function crestUrl(club: Club): string {
  return `${import.meta.env.BASE_URL}crests/${club.file}`;
}
