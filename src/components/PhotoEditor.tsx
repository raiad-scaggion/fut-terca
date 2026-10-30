import { useEffect, useRef, useState, type ChangeEvent, type PointerEvent } from "react";
import { savePhoto } from "../data/photos";
import { fitPerson, type Fit } from "../lib/photoFit";
import { cutOutPerson, decodeImage, exportCardPhoto } from "../photos/cutout";

type PhotoEditorProps = {
  playerId: string;
  playerName: string;
  onClose: () => void;
};

type Step = "pick" | "working" | "adjust";

const STAGE = 390;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2.5;

// Dragging moves the photo and the slider zooms from the center, so one thumb is enough at the pitch.
export function PhotoEditor({ playerId, playerName, onClose }: PhotoEditorProps) {
  const [step, setStep] = useState<Step>("pick");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [image, setImage] = useState<HTMLCanvasElement | null>(null);
  const [base, setBase] = useState<Fit>({ scale: 1, x: 0, y: 0 });
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const fileInput = useRef<HTMLInputElement>(null);
  const stageCanvas = useRef<HTMLCanvasElement>(null);
  const drag = useRef<{ x: number; y: number } | null>(null);

  const fit: Fit = {
    scale: base.scale * zoom,
    x: STAGE / 2 + (base.x - STAGE / 2) * zoom + offset.x,
    y: STAGE / 2 + (base.y - STAGE / 2) * zoom + offset.y,
  };

  useEffect(() => {
    const context = stageCanvas.current?.getContext("2d");
    if (!context || !image) {
      return;
    }
    context.clearRect(0, 0, STAGE, STAGE);
    context.drawImage(image, fit.x, fit.y, image.width * fit.scale, image.height * fit.scale);
  }, [image, fit.x, fit.y, fit.scale]);

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }

    setStep("working");
    setError("");
    try {
      const source = await decodeImage(file);
      const cutout = await cutOutPerson(source);
      if (!cutout) {
        setError("Não achei ninguém nessa foto. Tente outra, de frente e com a pessoa bem visível.");
        setStep("pick");
        return;
      }
      setImage(cutout.canvas);
      setBase(fitPerson(cutout.person, STAGE));
      setOffset({ x: 0, y: 0 });
      setZoom(1);
      setStep("adjust");
    } catch {
      setError("Não deu para recortar a foto. Confira sua conexão e tente de novo.");
      setStep("pick");
    }
  };

  const handleSave = async () => {
    if (!image) {
      return;
    }
    setSaving(true);
    setError("");
    try {
      await savePhoto(playerId, exportCardPhoto(image, fit, STAGE));
      onClose();
    } catch {
      setError("Não deu para salvar a foto. Confira sua conexão e tente de novo.");
      setSaving(false);
    }
  };

  const handlePointerDown = (event: PointerEvent<HTMLCanvasElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { x: event.clientX, y: event.clientY };
  };

  const handlePointerMove = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!drag.current) {
      return;
    }
    const ratio = STAGE / event.currentTarget.clientWidth;
    const dx = (event.clientX - drag.current.x) * ratio;
    const dy = (event.clientY - drag.current.y) * ratio;
    drag.current = { x: event.clientX, y: event.clientY };
    setOffset((current) => ({ x: current.x + dx, y: current.y + dy }));
  };

  return (
    <div className="sheet-backdrop" onClick={() => !saving && onClose()}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={`Foto de ${playerName}`} onClick={(event) => event.stopPropagation()}>
        <div className="sheet__handle" aria-hidden="true" />
        <div className="sheet__header">
          <h2 className="sheet__title">Foto de {playerName}</h2>
          <button type="button" className="button button--ghost" disabled={saving} onClick={onClose}>
            Fechar
          </button>
        </div>

        <input ref={fileInput} type="file" accept="image/*" hidden onChange={handleFile} />

        {step === "pick" && (
          <div className="photo-pick">
            <p className="draw-hint">Do peito para cima, de frente e contra uma parede lisa. O fundo sai sozinho.</p>
            <button type="button" className="button button--primary draw-button" onClick={() => fileInput.current?.click()}>
              Tirar ou escolher foto
            </button>
          </div>
        )}

        {step === "working" && <p className="draw-hint photo-working">Recortando a foto. Na primeira vez pode levar alguns segundos.</p>}

        {step === "adjust" && (
          <>
            <canvas
              ref={stageCanvas}
              width={STAGE}
              height={STAGE}
              className="photo-stage"
              aria-label="Arraste para ajustar a foto"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={() => {
                drag.current = null;
              }}
              onPointerCancel={() => {
                drag.current = null;
              }}
            />
            <label className="form-field photo-zoom">
              <span className="form-field__label">Zoom</span>
              <input type="range" min={MIN_ZOOM} max={MAX_ZOOM} step="0.01" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} />
            </label>
            <div className="sheet__actions">
              <button type="button" className="button button--ghost" disabled={saving} onClick={() => fileInput.current?.click()}>
                Trocar foto
              </button>
              <button type="button" className="button button--primary" disabled={saving} onClick={handleSave}>
                {saving ? "Salvando..." : "Salvar foto"}
              </button>
            </div>
          </>
        )}

        {error && <p className="form-error">{error}</p>}
      </div>
    </div>
  );
}
