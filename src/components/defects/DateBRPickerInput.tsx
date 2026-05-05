"use client";

import { useRef } from "react";
import { Calendar } from "lucide-react";
import { isoToDateBRInput, maskDateBRInput } from "@/lib/date";

type Props = {
  label: string;
  value: string;
  onChange: (next: string) => void;
};

export function DateBRPickerInput({ label, value, onChange }: Props) {
  const nativeRef = useRef<HTMLInputElement>(null);

  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      <div className="mt-1 flex items-center gap-2">
        <input
          inputMode="numeric"
          placeholder="dd/mm/aaaa"
          maxLength={10}
          className="w-full max-w-[180px] rounded-md border border-slate-300 px-2 py-2 text-sm"
          value={value}
          onChange={(e) => onChange(maskDateBRInput(e.target.value))}
        />
        <button
          type="button"
          className="rounded-md border border-slate-300 bg-white p-2 text-slate-700 hover:bg-slate-50"
          title="Abrir calendário"
          onClick={() => nativeRef.current?.showPicker?.()}
        >
          <Calendar className="h-4 w-4" />
        </button>
        <input
          ref={nativeRef}
          type="date"
          className="sr-only"
          onChange={(e) => onChange(isoToDateBRInput(e.target.value))}
        />
      </div>
    </label>
  );
}
