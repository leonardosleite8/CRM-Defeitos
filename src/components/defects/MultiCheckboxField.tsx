"use client";

export function MultiCheckboxField<T extends string>({
  label,
  options,
  selected,
  onChange,
  idPrefix,
}: {
  label: string;
  options: readonly T[];
  selected: T[];
  onChange: (next: T[]) => void;
  idPrefix: string;
}) {
  const toggle = (opt: T) => {
    if (selected.includes(opt)) onChange(selected.filter((x) => x !== opt));
    else onChange([...selected, opt]);
  };

  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium text-slate-700">{label}</legend>
      <div className="max-h-40 space-y-1.5 overflow-y-auto rounded-md border border-slate-200 bg-slate-50/80 p-2">
        {options.map((opt) => {
          const id = `${idPrefix}-${opt.replace(/\W/g, "-")}`;
          return (
            <label key={opt} htmlFor={id} className="flex cursor-pointer items-center gap-2 text-sm text-slate-800">
              <input
                id={id}
                type="checkbox"
                checked={selected.includes(opt)}
                onChange={() => toggle(opt)}
                className="rounded border-slate-300"
              />
              <span>{opt}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
