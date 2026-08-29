interface Member {
  name: string;
  role: string;
}

const TEAM: Member[] = [
  { name: "Jordi", role: "Sistema de diseño" },
  { name: "Josue", role: "Database" },
  { name: "Deyane", role: "Conexiones e IA" },
  { name: "Hugo", role: "Integración" },
  { name: "Hector", role: "Integración" },
];

export function Team() {
  return (
    <section className="px-3 py-12 sm:px-6 sm:py-16">
      <p className="text-[11px] tracking-[0.16em] text-muted-foreground">
        Equipo
      </p>
      <ul className="mt-6 grid gap-0 border border-border sm:grid-cols-5">
        {TEAM.map((member) => (
          <li
            key={member.name}
            className="border-border p-4 sm:border-r sm:last:border-r-0 max-sm:border-b max-sm:last:border-b-0"
          >
            <p className="text-sm">{member.name}</p>
            <p className="mt-1 text-xs text-muted-foreground">{member.role}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
