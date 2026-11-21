// Simple horizontal bars drawn with plain CSS (no chart library).
// items: [{ key, label, value }]. Each bar is as wide as its share of the biggest value.
export default function BarList({ items }) {
  const max = Math.max(1, ...items.map((item) => item.value));
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item.key}>
          <div className="mb-0.5 flex items-center justify-between text-sm">
            <span>{item.label}</span>
            {/* the number is always written, the bar is only a visual aid */}
            <span className="font-bold">{item.value}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-beige dark:bg-[#232963]" aria-hidden="true">
            <div className="h-full rounded-full bg-terracotta-dark" style={{ width: `${(item.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
