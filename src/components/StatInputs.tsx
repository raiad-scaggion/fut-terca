import { isStatText, type StatDef, type StatText } from "../lib/players";

type StatInputsProps = {
  defs: StatDef<string>[];
  values: StatText;
  onChange: (key: string, value: string) => void;
  disabled?: boolean;
};

// Six number fields, 0 to 100, used by the edit form and the Rebalanceamento.
export function StatInputs({ defs, values, onChange, disabled }: StatInputsProps) {
  return (
    <div className="rating-steppers">
      {defs.map(({ key, short, label }) => {
        const value = values[key] ?? "";
        const invalid = !isStatText(value);
        return (
          <label key={key} className={`rating-stepper${invalid ? " is-invalid" : ""}`}>
            <span className="rating-stepper__info">
              <span className="rating-stepper__short">{short}</span>
              <span className="rating-stepper__label">{label}</span>
            </span>
            <input
              type="number"
              inputMode="numeric"
              className="stat-input"
              min={0}
              max={100}
              step={1}
              value={value}
              disabled={disabled}
              aria-invalid={invalid}
              aria-label={`${label}, de 0 a 100`}
              onFocus={(event) => event.target.select()}
              onChange={(event) => onChange(key, event.target.value)}
            />
          </label>
        );
      })}
    </div>
  );
}
