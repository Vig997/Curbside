import { cn, formatCurrency } from "@/lib/helpers";

interface PriceMarkerProps {
  price: number;
  active?: boolean;
  isOwnerListing?: boolean;
  isDemo?: boolean;
  isReserved?: boolean;
}

export function PriceMarker({ price, active, isOwnerListing, isDemo, isReserved }: PriceMarkerProps) {
  return (
    <div className="flex flex-col items-center gap-1">
      {isOwnerListing ? (
        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[8px] font-semibold uppercase tracking-[0.12em] text-amber-900 shadow-sm">
          Your listing
        </span>
      ) : isDemo ? (
        <span className="rounded-full border border-white/70 bg-white/92 px-2 py-0.5 text-[8px] font-semibold uppercase tracking-[0.12em] text-teal-800 shadow-sm">
          Demo
        </span>
      ) : isReserved ? (
        <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[8px] font-semibold uppercase tracking-[0.12em] text-rose-900 shadow-sm">
          Reserved
        </span>
      ) : null}
      <div
        className={cn(
          "cursor-pointer rounded-[1rem] border px-3 py-2 text-xs font-semibold shadow-soft transition-all duration-300 ease-smooth hover:-translate-y-0.5 hover:scale-105 hover:shadow-floating active:scale-95",
          isReserved
            ? "border-rose-200/80 bg-rose-50/96 text-rose-900"
            : "border-teal-200/80 bg-white/96 text-teal-900",
          active && !isReserved && "scale-105 bg-primary text-primary-foreground shadow-floating",
          active && isReserved && "scale-105 border-rose-300 bg-rose-200 text-rose-950 shadow-floating"
        )}
      >
        {formatCurrency(price)}
      </div>
    </div>
  );
}

