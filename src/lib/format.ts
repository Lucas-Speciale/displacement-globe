export function formatPeople(value: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
}

export function formatCompact(value: number): string {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: value >= 1_000_000 ? 1 : 0,
  }).format(value);
}

export function formatChange(value: number | null): string {
  if (value === null) return "No comparable prior value";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}% from prior year`;
}

