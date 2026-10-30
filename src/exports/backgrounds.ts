// All photos come from Wikimedia Commons under free licenses that require credit, which is printed
// on the image. Sources are listed in public/backgrounds/CREDITS.md.
const BASE = `${import.meta.env.BASE_URL}backgrounds/`;

export type Background = {
  src: string;
  credit: string;
};

const PHOTOS = [
  { file: "bernabeu.jpg", credit: "Footballkickit", license: "CC BY 3.0" },
  { file: "cristiano-real-madrid.jpg", credit: "KANO PHOTO", license: "CC BY-SA 2.0" },
  { file: "neymar-barcelona-apresentacao.jpg", credit: "Danilo Borges/copa2014.gov.br", license: "CC BY 3.0 BR" },
  { file: "maracana.jpg", credit: "Rob / BBM Explorer", license: "CC BY 2.0" },
  { file: "neymar-barcelona.jpg", credit: "Alex Fau, recorte de Danyele", license: "CC BY 2.0" },
  { file: "san-siro.jpg", credit: "Vincenzo.togni", license: "CC BY-SA 4.0" },
  { file: "messi-camp-nou.jpg", credit: "Ank Kumar", license: "CC BY-SA 4.0" },
  { file: "anfield.jpg", credit: "Arne Müseler", license: "CC BY-SA 3.0 DE" },
].map(({ file, credit, license }) => ({ src: `${BASE}${file}`, credit: `Foto: ${credit} · ${license} · Wikimedia Commons` }));

let last = -1;

// Never repeats the previous photo, so "Trocar fundo" always changes the image.
export function nextBackground(): Background {
  const index = (last + 1 + Math.floor(Math.random() * (PHOTOS.length - 1))) % PHOTOS.length;
  last = index;
  return PHOTOS[index];
}
