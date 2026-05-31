export const CHART = {
  cold: "#1a73e8",
  zerog: "#9334e6",
  success: "#188038",
  grid: "#e8eaed",
  axis: "#dadce0",
  text: "#5f6368",
  muted: "#80868b",
} as const;

export function chartGrid(w: number, h: number, pad = 40) {
  const lines: string[] = [];
  for (let i = 0; i <= 4; i++) {
    const y = pad + ((h - pad * 2) * i) / 4;
    lines.push(`M${pad},${y} L${w - pad},${y}`);
  }
  for (let i = 0; i <= 4; i++) {
    const x = pad + ((w - pad * 2) * i) / 4;
    lines.push(`M${x},${pad} L${x},${h - pad}`);
  }
  return lines;
}

export function seriesPoints(
  values: number[],
  w: number,
  h: number,
  pad = 40,
  cumulative = false
): string {
  if (values.length === 0) return "";
  const plot = cumulative
    ? values.reduce<number[]>((acc, v) => {
        acc.push((acc.at(-1) ?? 0) + v);
        return acc;
      }, [])
    : values;
  const max = Math.max(...plot, 1);
  return plot
    .map((v, i) => {
      const x = pad + (i / Math.max(plot.length - 1, 1)) * (w - pad * 2);
      const y = h - pad - (v / max) * (h - pad * 2);
      return `${x},${y}`;
    })
    .join(" ");
}

export function ChartLegend({ items }: { items: { color: string; label: string }[] }) {
  return (
    <div className="flex flex-wrap gap-4 mt-3">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-2 text-xs font-mono text-text-secondary">
          <span className="inline-block h-2 w-4 rounded-sm" style={{ background: item.color }} />
          {item.label}
        </div>
      ))}
    </div>
  );
}

export function ChartFrame({
  title,
  children,
  legend,
  empty,
}: {
  title: string;
  children: React.ReactNode;
  legend?: { color: string; label: string }[];
  empty?: string;
}) {
  return (
    <div className="ag-card rounded-xl p-4">
      <p className="text-xs text-muted mb-2 font-mono">{title}</p>
      {empty ? (
        <p className="text-xs text-muted font-mono py-10 text-center">{empty}</p>
      ) : (
        <>
          {children}
          {legend && <ChartLegend items={legend} />}
        </>
      )}
    </div>
  );
}
