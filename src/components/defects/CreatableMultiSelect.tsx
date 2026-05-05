"use client";

import { useMemo, useState } from "react";
import { Check, ChevronDown, Plus, X } from "lucide-react";

type Props = {
  label: string;
  options: string[];
  selected: string[];
  onSelectedChange: (next: string[]) => void;
  onOptionsChange: (next: string[]) => void;
  placeholder?: string;
};

export function CreatableMultiSelect({
  label,
  options,
  selected,
  onSelectedChange,
  onOptionsChange,
  placeholder = "Selecione...",
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((opt) => opt.toLowerCase().includes(q));
  }, [options, query]);

  const normalizedQuery = query.trim();
  const canCreate =
    normalizedQuery.length > 0 &&
    !options.some((opt) => opt.toLowerCase() === normalizedQuery.toLowerCase());

  const toggleSelected = (item: string) => {
    if (selected.includes(item)) {
      onSelectedChange(selected.filter((s) => s !== item));
      return;
    }
    onSelectedChange([...selected, item]);
  };

  const removeChip = (item: string) => {
    const ok = confirm(`Você tem certeza que deseja remover o item "${item}"?`);
    if (!ok) return;
    onSelectedChange(selected.filter((s) => s !== item));
  };

  const confirmAddItem = () => {
    if (!canCreate) return;
    const ok = confirm(`Você tem certeza que deseja adicionar o item "${normalizedQuery}"?`);
    if (!ok) return;
    onOptionsChange([...options, normalizedQuery]);
    onSelectedChange([...selected, normalizedQuery]);
    setQuery("");
  };

  const confirmRemoveFromSuggestions = (item: string) => {
    const ok = confirm(`Você tem certeza que deseja remover o item "${item}"?`);
    if (!ok) return;
    onOptionsChange(options.filter((opt) => opt !== item));
    onSelectedChange(selected.filter((s) => s !== item));
  };

  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-slate-700">{label}</label>

      <div className="rounded-md border border-slate-300 bg-white p-2 shadow-sm">
        <div className="mb-2 flex flex-wrap gap-1.5">
          {selected.length === 0 ? <span className="text-sm text-slate-400">{placeholder}</span> : null}
          {selected.map((item) => (
            <span
              key={item}
              className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs text-blue-900"
            >
              {item}
              <button
                type="button"
                className="rounded-full p-0.5 hover:bg-blue-100"
                onClick={() => removeChip(item)}
                title={`Remover ${item}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex w-full items-center justify-between rounded-md border border-slate-300 px-2 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-300"
        >
          <span>{open ? "Fechar lista" : "Abrir lista"}</span>
          <ChevronDown className={`h-4 w-4 transition ${open ? "rotate-180" : ""}`} />
        </button>

        {open ? (
          <div className="mt-2 space-y-2 rounded-md border border-slate-200 bg-slate-50 p-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Pesquisar ou criar item..."
              className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-300"
            />

            <div className="max-h-44 space-y-1 overflow-y-auto">
              {filtered.map((item) => (
                <div key={item} className="flex items-center justify-between rounded bg-white px-2 py-1">
                  <button
                    type="button"
                    className="flex flex-1 items-center gap-2 text-left text-sm text-slate-800"
                    onClick={() => toggleSelected(item)}
                  >
                    <span
                      className={`inline-flex h-4 w-4 items-center justify-center rounded border ${
                        selected.includes(item) ? "border-blue-700 bg-blue-700 text-white" : "border-slate-300 bg-white"
                      }`}
                    >
                      {selected.includes(item) ? <Check className="h-3 w-3" /> : null}
                    </span>
                    <span>{item}</span>
                  </button>
                  <button
                    type="button"
                    className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-700"
                    title={`Remover ${item} da lista`}
                    onClick={() => confirmRemoveFromSuggestions(item)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              {filtered.length === 0 ? <p className="text-xs text-slate-500">Nenhum item encontrado.</p> : null}
            </div>

            {canCreate ? (
              <button
                type="button"
                onClick={confirmAddItem}
                className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-medium text-blue-900 hover:bg-blue-100"
              >
                <Plus className="h-3.5 w-3.5" />
                Adicionar "{normalizedQuery}"
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
