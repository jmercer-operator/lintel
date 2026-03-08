import { Card } from "@/components/Card";

type ProjectStatus = "Active" | "Pre-launch" | "Sold Out" | "Settling";

const statusColors: Record<ProjectStatus, { bg: string; text: string }> = {
  Active: { bg: "bg-[#1A9E6F]/10", text: "text-[#1A9E6F]" },
  "Pre-launch": { bg: "bg-[#D4A855]/10", text: "text-[#D4A855]" },
  "Sold Out": { bg: "bg-[#7B3FA0]/10", text: "text-[#7B3FA0]" },
  Settling: { bg: "bg-[#3BA3A3]/10", text: "text-[#3BA3A3]" },
};

const projectsData = [
  {
    name: "6 Cross Street",
    address: "6 Cross Street, Footscray VIC 3011",
    status: "Active" as ProjectStatus,
    available: 12,
    total: 48,
    progressColor: "#1A9E6F",
  },
  {
    name: "38-44 Hockley Ave",
    address: "38-44 Hockley Ave, Clarendon VIC 3352",
    status: "Pre-launch" as ProjectStatus,
    available: 24,
    total: 24,
    progressColor: "#D4A855",
  },
  {
    name: "67-69 Bell St",
    address: "67-69 Bell St, Coburg VIC 3058",
    status: "Sold Out" as ProjectStatus,
    available: 0,
    total: 36,
    progressColor: "#7B3FA0",
  },
  {
    name: "12 Duke St",
    address: "12 Duke St, Sunshine VIC 3020",
    status: "Settling" as ProjectStatus,
    available: 2,
    total: 18,
    progressColor: "#3BA3A3",
  },
];

export default function ProjectsPage() {
  return (
    <div className="space-y-6 lg:space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-heading">Projects</h1>
        <p className="text-secondary text-sm mt-1">
          All your development projects in one place
        </p>
      </div>

      {/* Project Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6">
        {projectsData.map((project) => {
          const sold = project.total - project.available;
          const progressPct = (sold / project.total) * 100;

          return (
            <Card
              key={project.name}
              padding="md"
              className="hover:shadow-card-hover cursor-pointer transition-shadow"
            >
              <div className="space-y-4">
                {/* Project name + status */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-heading">{project.name}</h3>
                    <p className="text-sm text-secondary mt-0.5">{project.address}</p>
                  </div>
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold flex-shrink-0 ${statusColors[project.status].bg} ${statusColors[project.status].text}`}>
                    {project.status}
                  </span>
                </div>

                {/* Stock summary */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-body">
                    <span className="font-semibold text-heading">{project.available}</span>
                    <span className="text-secondary"> available</span>
                    <span className="text-muted mx-1">/</span>
                    <span className="font-mono text-heading">{project.total}</span>
                    <span className="text-secondary"> total</span>
                  </span>
                  <span className="font-mono text-xs text-secondary">{Math.round(progressPct)}%</span>
                </div>

                {/* Progress bar */}
                <div className="w-full h-2 bg-bg-alt rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${progressPct}%`,
                      backgroundColor: project.progressColor,
                    }}
                  />
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
