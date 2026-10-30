import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { shareImage } from "../exports/share";

type RenderImage = (photo: File | null) => Promise<Blob | null>;

type ExportSheetProps = {
  title: string;
  fileName: string;
  render: RenderImage;
  onClose: () => void;
};

type Preview = { blob: Blob; url: string };

const RENDER_ERROR = "Não deu para gerar a imagem. Tente de novo.";

// The image is drawn before the share button appears. Phones refuse to share when the tap that
// asked for it happened too long ago, and drawing a photo takes a moment.
function ExportSheet({ title, fileName, render, onClose }: ExportSheetProps) {
  // Frozen when the sheet opens, so a database update in the background doesn't redraw the image.
  const [draw] = useState(() => render);
  const [photo, setPhoto] = useState<File | null>(null);
  const [round, setRound] = useState(0);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let current = true;
    draw(photo)
      .then((blob) => {
        if (current) {
          setError(blob ? "" : RENDER_ERROR);
          setPreview(blob ? { blob, url: URL.createObjectURL(blob) } : null);
        }
      })
      .catch(() => {
        if (current) {
          setError(RENDER_ERROR);
        }
      });
    return () => {
      current = false;
    };
  }, [draw, photo, round]);

  useEffect(() => () => {
    if (preview) {
      URL.revokeObjectURL(preview.url);
    }
  }, [preview]);

  const handlePhoto = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) {
      setPhoto(file);
    }
  };

  const handleSwap = () => {
    setPhoto(null);
    setRound(round + 1);
  };

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title} onClick={(event) => event.stopPropagation()}>
        <div className="sheet__handle" aria-hidden="true" />
        <div className="sheet__header">
          <h2 className="sheet__title">{title}</h2>
          <button type="button" className="button button--ghost" onClick={onClose}>
            Fechar
          </button>
        </div>

        <div className="export-preview">
          {preview ? <img src={preview.url} alt={title} /> : <span>{error ? "" : "Gerando imagem..."}</span>}
        </div>

        {error && <p className="form-error">{error}</p>}

        <div className="export-actions">
          <button type="button" className="button button--ghost" onClick={handleSwap}>
            Trocar fundo
          </button>
          <button type="button" className="button button--ghost" onClick={() => fileInput.current?.click()}>
            Foto do celular
          </button>
        </div>
        <input ref={fileInput} type="file" accept="image/*" hidden onChange={handlePhoto} />

        <div className="sheet__actions">
          <button type="button" className="button button--primary" disabled={!preview} onClick={() => preview && shareImage(preview.blob, fileName, title)}>
            Compartilhar
          </button>
        </div>
      </div>
    </div>
  );
}

type ExportImageProps = {
  label: string;
  title: string;
  fileName: string;
  render: RenderImage;
};

export function ExportImage({ label, title, fileName, render }: ExportImageProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" className="button button--ghost draw-button" onClick={() => setOpen(true)}>
        {label}
      </button>
      {open && <ExportSheet title={title} fileName={fileName} render={render} onClose={() => setOpen(false)} />}
    </>
  );
}
