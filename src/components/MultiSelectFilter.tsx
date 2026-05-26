import * as React from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface MultiSelectOption {
  value: string;
  label: string;
}

interface MultiSelectFilterProps {
  options: MultiSelectOption[];
  selected: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  className?: string;
  emptyLabel?: string;
}

export function MultiSelectFilter({
  options,
  selected,
  onChange,
  placeholder = "Todos",
  searchPlaceholder = "Buscar...",
  className,
  emptyLabel = "Sin resultados",
}: MultiSelectFilterProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  const toggle = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  const allSelected = selected.length === 0;
  const selectedLabels = options
    .filter((o) => selected.includes(o.value))
    .map((o) => o.label);

  let triggerText: React.ReactNode = placeholder;
  if (selectedLabels.length === 1) triggerText = selectedLabels[0];
  else if (selectedLabels.length > 1)
    triggerText = `${selectedLabels.length} seleccionados`;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "h-9 w-full justify-between font-normal",
            allSelected && "text-muted-foreground",
            className
          )}
        >
          <span className="truncate text-left">{triggerText}</span>
          <div className="flex items-center gap-1 shrink-0 ml-2">
            {selected.length > 0 && (
              <Badge variant="secondary" className="h-5 px-1.5">
                {selected.length}
              </Badge>
            )}
            <ChevronDown className="h-4 w-4 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[min(90vw,320px)] p-0"
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="p-2 border-b">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="h-8 pl-7 text-sm"
            />
          </div>
        </div>
        <div className="flex items-center justify-between px-2 py-1.5 border-b text-xs">
          <button
            type="button"
            className="text-primary hover:underline disabled:opacity-50 disabled:no-underline"
            onClick={() => onChange([])}
            disabled={selected.length === 0}
          >
            Limpiar
          </button>
          <span className="text-muted-foreground">
            {selected.length === 0 ? "Todos" : `${selected.length} seleccionados`}
          </span>
        </div>
        <ScrollArea className="h-[240px]">
          <div className="p-1">
            {filtered.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">
                {emptyLabel}
              </p>
            ) : (
              filtered.map((o) => {
                const isSelected = selected.includes(o.value);
                return (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => toggle(o.value)}
                    className={cn(
                      "w-full flex items-center gap-2 px-2 py-1.5 rounded-sm text-sm text-left hover:bg-accent hover:text-accent-foreground transition-colors",
                      isSelected && "bg-accent/50"
                    )}
                  >
                    <div
                      className={cn(
                        "h-4 w-4 rounded-sm border flex items-center justify-center shrink-0",
                        isSelected
                          ? "bg-primary border-primary text-primary-foreground"
                          : "border-input"
                      )}
                    >
                      {isSelected && <Check className="h-3 w-3" />}
                    </div>
                    <span className="truncate">{o.label}</span>
                  </button>
                );
              })
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
