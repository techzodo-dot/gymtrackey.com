import { formatMoney } from "@/lib/money";

type Point = { label: string; value: number };

/** Accessible bar chart (SVG-free, CSS bars) with a visually-hidden data table for screen readers. */
export function BarChart({ data, title, money = false, height = 160 }: { data: Point[]; title: string; money?: boolean; height?: number }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const fmt = (v: number) => (money ? formatMoney(v) : String(v));
  return (
    <figure>
      <figcaption className="mb-3 text-sm font-semibold">{title}</figcaption>
      <div className="flex items-end gap-1.5" style={{ height }} aria-hidden>
        {data.map((d) => (
          <div key={d.label} className="group relative flex h-full flex-1 flex-col justify-end" title={`${d.label}: ${fmt(d.value)}`}>
            <div className="gt-gradient-bg rounded-t-md opacity-90 transition group-hover:opacity-100" style={{ height: `${Math.max(2, (d.value / max) * 100)}%` }} />
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex gap-1.5 text-[10px] text-muted" aria-hidden>{data.map((d, i) => <span key={d.label} className="flex-1 truncate text-center">{data.length > 14 && i % 3 ? "" : d.label}</span>)}</div>
      <table className="sr-only"><caption>{title}</caption><tbody>{data.map((d) => <tr key={d.label}><th scope="row">{d.label}</th><td>{fmt(d.value)}</td></tr>)}</tbody></table>
    </figure>
  );
}

export function DualBars({ data, title }: { data: { label: string; a: number; b: number }[]; title: string }) {
  const max = Math.max(1, ...data.flatMap((d) => [d.a, d.b]));
  return (
    <figure>
      <figcaption className="mb-3 flex items-center justify-between text-sm font-semibold">{title}
        <span className="flex gap-3 text-xs font-normal text-muted"><i className="mr-1 inline-block h-2 w-2 rounded-full bg-brand" />Revenue<i className="mr-1 ml-2 inline-block h-2 w-2 rounded-full bg-danger" />Expenses</span></figcaption>
      <div className="flex h-40 items-end gap-2" aria-hidden>
        {data.map((d) => (
          <div key={d.label} className="flex h-full flex-1 items-end gap-0.5" title={`${d.label} — revenue ${formatMoney(d.a)}, expenses ${formatMoney(d.b)}`}>
            <div className="flex-1 rounded-t bg-brand" style={{ height: `${Math.max(2, (d.a / max) * 100)}%` }} />
            <div className="flex-1 rounded-t bg-danger" style={{ height: `${Math.max(2, (d.b / max) * 100)}%` }} />
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex gap-2 text-[10px] text-muted" aria-hidden>{data.map((d) => <span key={d.label} className="flex-1 truncate text-center">{d.label}</span>)}</div>
      <table className="sr-only"><caption>{title}</caption><tbody>{data.map((d) => <tr key={d.label}><th scope="row">{d.label}</th><td>{formatMoney(d.a)}</td><td>{formatMoney(d.b)}</td></tr>)}</tbody></table>
    </figure>
  );
}

export function LineChart({ data, title, height = 120 }: { data: Point[]; title: string; height?: number }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const w = 300, pad = 6;
  const pts = data.map((d, i) => `${pad + (i * (w - 2 * pad)) / Math.max(1, data.length - 1)},${height - pad - (d.value / max) * (height - 2 * pad)}`).join(" ");
  return (
    <figure>
      <figcaption className="mb-2 text-sm font-semibold">{title}</figcaption>
      <svg viewBox={`0 0 ${w} ${height}`} className="w-full" role="img" aria-label={`${title}: ${data.map((d) => `${d.label} ${d.value}`).join(", ")}`}>
        <defs><linearGradient id="lc" x1="0" x2="1"><stop offset="0" stopColor="#3df09a" /><stop offset="1" stopColor="#1e9bff" /></linearGradient></defs>
        <polyline fill="none" stroke="url(#lc)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" points={pts} />
      </svg>
      <div className="flex justify-between text-[10px] text-muted"><span>{data[0]?.label}</span><span>{data.at(-1)?.label}</span></div>
    </figure>
  );
}

/** Horizontal share bars for distributions (gender, plans, categories…). */
export function ShareBars({ data, title, money }: { data: { name: string; value: number }[]; title: string; money?: boolean }) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  return (
    <div>
      <p className="mb-3 text-sm font-semibold">{title}</p>
      {data.length === 0 && <p className="text-sm text-muted">No data yet.</p>}
      <ul className="space-y-2.5">
        {data.map((d) => (
          <li key={d.name}>
            <div className="flex justify-between text-xs"><span>{d.name}</span><span className="text-muted">{money ? formatMoney(d.value) : d.value} · {Math.round((d.value / total) * 100)}%</span></div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-surface2"><div className="gt-gradient-bg h-full" style={{ width: `${(d.value / total) * 100}%` }} /></div>
          </li>
        ))}
      </ul>
    </div>
  );
}
