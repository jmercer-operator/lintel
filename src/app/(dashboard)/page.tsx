import { Card } from "@/components/Card";
import { Badge } from "@/components/Badge";

const metrics = [
  { label: "Total Stock", value: "48", variant: "default" as const, accent: false },
  { label: "Available", value: "12", variant: "success" as const, accent: true, accentColor: "var(--color-success)" },
  { label: "Under Contract", value: "28", variant: "accent" as const, accent: true, accentColor: "var(--color-gold)" },
  { label: "Settled", value: "8", variant: "info" as const, accent: true, accentColor: "var(--color-info)" },
];

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-heading">Dashboard</h1>
        <p className="text-secondary text-sm mt-1">
          Overview of your project portfolio
        </p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric) => (
          <Card
            key={metric.label}
            accent={metric.accent}
            accentColor={metric.accentColor}
            padding="md"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-secondary font-medium">
                {metric.label}
              </span>
              <Badge variant={metric.variant}>
                {metric.label.split(" ").pop()}
              </Badge>
            </div>
            <p className="text-3xl font-bold text-heading">
              {metric.value}
            </p>
          </Card>
        ))}
      </div>

      {/* Empty state — Stock Table */}
      <Card padding="lg">
        <div className="text-center py-12">
          <div className="w-12 h-12 rounded-full bg-bg-alt flex items-center justify-center mx-auto mb-4">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-muted"
            >
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-heading mb-1">
            No stock data yet
          </h3>
          <p className="text-sm text-secondary max-w-sm mx-auto">
            Connect your Supabase database and start adding projects to see your stock table here.
          </p>
        </div>
      </Card>
    </div>
  );
}
