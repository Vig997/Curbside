"use client";

import type { ReactNode } from "react";
import { ArrowRight, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SPOT_TYPE_OPTIONS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { SpotFilters } from "@/types";

interface FilterBarProps {
  filters: SpotFilters;
  locationQuery: string;
  locationError: string | null;
  summary?: ReactNode;
  onChange: (next: SpotFilters) => void;
  onLocationQueryChange: (value: string) => void;
  onApply: () => void;
}

const fieldShellClass =
  "flex h-[4.5rem] flex-col justify-between overflow-hidden rounded-xl border border-border bg-white/90 px-3 py-2 shadow-sm";

function FilterField({
  label,
  className,
  children
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn(fieldShellClass, className)}>
      <label className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">{label}</label>
      <div className="min-h-0">{children}</div>
    </div>
  );
}

export function FilterBar({
  filters,
  locationQuery,
  locationError,
  summary,
  onChange,
  onLocationQueryChange,
  onApply
}: FilterBarProps) {
  return (
    <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-[repeat(5,minmax(0,1fr))_minmax(11.5rem,1.4fr)]">
      <FilterField label="Location" className="sm:col-span-2 xl:col-span-1">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-sky-500" />
          <Input
            value={locationQuery}
            onChange={(event) => onLocationQueryChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                onApply();
              }
            }}
            placeholder="Isla Vista, UCSB..."
            className="h-9 border-sky-100 bg-sky-50/80 pl-9 text-sm"
          />
        </div>
        {locationError ? <p className="text-xs text-rose-500">{locationError}</p> : null}
      </FilterField>

      <FilterField label="Price">
        <div className="space-y-0.5">
          <Input
            type="range"
            min={5}
            max={60}
            step={1}
            value={filters.maxPrice}
            onChange={(event) => onChange({ ...filters, maxPrice: Number(event.target.value) })}
            className="h-3 border-0 bg-transparent px-0 py-0 shadow-none"
          />
          <div className="text-xs text-muted-foreground">Up to ${filters.maxPrice}/hr</div>
        </div>
      </FilterField>

      <FilterField label="Keyword">
        <Input
          value={filters.search}
          onChange={(event) => onChange({ ...filters, search: event.target.value })}
          placeholder="Title or notes"
          className="h-9 text-sm"
        />
      </FilterField>

      <FilterField label="Spot Type">
        <Select value={filters.type} onValueChange={(value) => onChange({ ...filters, type: value as SpotFilters["type"] })}>
          <SelectTrigger className="h-9 w-full text-sm">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {SPOT_TYPE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FilterField>

      <FilterField label="Options">
        <div className="flex flex-col justify-center gap-0.5 2xl:flex-row 2xl:items-center 2xl:justify-between 2xl:gap-1">
          <label className="flex min-w-0 items-center gap-1 text-[8px] leading-none sm:text-[9px] 2xl:flex-1 2xl:justify-center">
            <input
              type="checkbox"
              className="h-3 w-3 shrink-0"
              checked={filters.availableNow}
              onChange={(event) => onChange({ ...filters, availableNow: event.target.checked })}
            />
            <span className="truncate">Available</span>
          </label>
          <label className="flex min-w-0 items-center gap-1 text-[8px] leading-none sm:text-[9px] 2xl:flex-1 2xl:justify-center">
            <input
              type="checkbox"
              className="h-3 w-3 shrink-0"
              checked={filters.coveredOnly}
              onChange={(event) => onChange({ ...filters, coveredOnly: event.target.checked })}
            />
            <span className="truncate">Covered</span>
          </label>
          <label className="flex min-w-0 items-center gap-1 text-[8px] leading-none sm:text-[9px] 2xl:flex-1 2xl:justify-center">
            <input
              type="checkbox"
              className="h-3 w-3 shrink-0"
              checked={filters.evChargingOnly}
              onChange={(event) => onChange({ ...filters, evChargingOnly: event.target.checked })}
            />
            <span className="truncate">EV</span>
          </label>
        </div>
      </FilterField>

      <div className={cn(fieldShellClass, "min-w-[11.5rem]")}>
        <div className="flex w-full flex-nowrap items-center justify-center gap-4 overflow-hidden">{summary}</div>
        <Button
          type="button"
          onClick={onApply}
          className="h-9 w-full rounded-xl bg-sky-400 px-4 text-sm text-sky-950 shadow-soft transition-all duration-300 ease-smooth hover:-translate-y-0.5 hover:bg-sky-300 hover:shadow-floating active:scale-[0.97]"
        >
          Go
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
