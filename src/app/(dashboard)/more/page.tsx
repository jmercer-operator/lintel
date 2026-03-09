import Link from "next/link";

const menuItems = [
  { label: "Customers", href: "/contacts", icon: "👥", desc: "Manage customers" },
  { label: "Documents", href: "/documents", icon: "📄", desc: "Project documents" },
  { label: "Reports", href: "/reports", icon: "📈", desc: "Reports & analytics" },
  { label: "Email Templates", href: "/more/templates", icon: "✉️", desc: "Manage email templates" },
  { label: "Registrations", href: "/registrations", icon: "📋", desc: "Agent registrations" },
];

export default function MorePage() {
  return (
    <div className="p-6 md:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-charcoal">More</h1>
      </div>
      <div className="space-y-2">
        {menuItems.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className="flex items-center gap-4 bg-white rounded-[10px] border border-border p-4 hover:border-emerald-primary/30 transition-colors"
          >
            <span className="text-2xl">{item.icon}</span>
            <div>
              <div className="font-semibold text-charcoal">{item.label}</div>
              <div className="text-sm text-muted">{item.desc}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
