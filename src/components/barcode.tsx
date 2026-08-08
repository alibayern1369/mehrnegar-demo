"use client";

export function Barcode({ value, className = "" }: { value: string; className?: string }) {
  const bars = value.split("").flatMap((d, i) => {
    const n = (Number(d) || i) + 2;
    return [Math.max(1, (n % 4) + 1), Math.max(1, ((n + i) % 3) + 1)];
  });
  return (
    <div className={`inline-block ${className}`}>
      <div className="flex h-12 items-end gap-[2px] rounded-lg bg-white p-2" dir="ltr">
        {bars.map((w, i) => (
          <span key={i} className="bg-black" style={{ width: `${w}px`, height: i % 5 === 0 ? "100%" : "85%" }} />
        ))}
      </div>
      <p className="mt-1 select-all text-center text-xs tracking-widest text-muted" dir="ltr">{value}</p>
    </div>
  );
}

export function QR({ value, size = 92 }: { value: string; size?: number }) {
  const n = 13;
  const cells: boolean[] = [];
  let seed = value.split("").reduce((a, c) => a + c.charCodeAt(0), 7);
  for (let i = 0; i < n * n; i++) {
    seed = (seed * 9301 + 49297) % 233280;
    cells.push(seed / 233280 > 0.5);
  }
  const finder = (r: number, c: number) =>
    (r < 3 && c < 3) || (r < 3 && c >= n - 3) || (r >= n - 3 && c < 3);
  const cell = size / n;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="rounded-lg bg-white p-1">
      {Array.from({ length: n * n }).map((_, i) => {
        const r = Math.floor(i / n), c = i % n;
        const on = finder(r, c) ? true : cells[i] && !( (r<4&&c<4)||(r<4&&c>=n-4)||(r>=n-4&&c<4) );
        return on ? <rect key={i} x={c * cell} y={r * cell} width={cell} height={cell} fill="#0a0a0a" /> : null;
      })}
    </svg>
  );
}
