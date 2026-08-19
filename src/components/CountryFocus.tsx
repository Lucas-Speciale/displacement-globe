import { formatChange, formatCompact, formatPeople } from "@/lib/format";
import type {
  CountryMeta,
  DataMode,
  FocusDirection,
  RouteView,
} from "@/types/displacement";

const MODE_NOUN: Record<DataMode, string> = {
  hosted: "refugees recorded",
  claims: "new applications",
  returns: "recorded returns",
  resettlement: "resettlement arrivals",
};

interface CountryFocusProps {
  country: CountryMeta;
  countries: CountryMeta[];
  mode: DataMode;
  direction: FocusDirection;
  value: number;
  change: number | null;
  routes: RouteView[];
  onClose: () => void;
}

export function CountryFocus({
  country,
  countries,
  mode,
  direction,
  value,
  change,
  routes,
  onClose,
}: CountryFocusProps) {
  return (
    <aside className="country-focus" aria-label={`${country.name} details`}>
      <button type="button" className="focus-close" onClick={onClose} aria-label="Clear country selection">×</button>
      <span>{direction === "outbound" ? "Leaving" : "Arriving"} · {MODE_NOUN[mode]}</span>
      <h2>{country.name}</h2>
      <div className="focus-total">
        <strong>{formatCompact(value)}</strong>
        <div><span>{formatPeople(value)}</span><small>{formatChange(change)}</small></div>
      </div>
      <ol>
        {routes.slice(0, 5).map((route, index) => {
          const counterpart = countries[direction === "outbound" ? route.destination : route.origin];
          return (
            <li key={`${route.origin}-${route.destination}`}>
              <small>{String(index + 1).padStart(2, "0")}</small>
              <span>{counterpart?.name ?? "Unknown"}</span>
              <strong>{formatCompact(route.value)}</strong>
            </li>
          );
        })}
      </ol>
    </aside>
  );
}

