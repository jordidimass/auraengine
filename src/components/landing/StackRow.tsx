interface StackItem {
  name: string;
  featured?: boolean;
}

const ITEMS: StackItem[] = [
  { name: "Convex", featured: true },
  { name: "Next.js" },
  { name: "Apify" },
  { name: "Exa" },
  { name: "fal.ai" },
  { name: "ElevenLabs" },
];

export function StackRow() {
  return (
    <section className="px-3 py-12 sm:px-6 sm:py-16">
      <p className="text-[11px] tracking-[0.16em] text-muted-foreground">
        Stack
      </p>
      <ul className="mt-6 flex flex-wrap gap-2">
        {ITEMS.map((item) => (
          <li
            key={item.name}
            className={
              item.featured
                ? "border border-foreground/40 px-3 py-1.5 text-xs"
                : "border border-border px-3 py-1.5 text-xs text-muted-foreground"
            }
          >
            {item.name}
          </li>
        ))}
      </ul>
    </section>
  );
}
