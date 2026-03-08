export default function StockPage() {
  return (
    <div className="p-6 md:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-charcoal">Stock</h1>
        <p className="text-muted mt-1">Manage inventory across all projects</p>
      </div>
      <div className="bg-white rounded-[14px] border border-border p-12 text-center">
        <div className="text-4xl mb-4">🏗️</div>
        <h2 className="text-lg font-semibold text-charcoal mb-2">Coming in Checkpoint 3</h2>
        <p className="text-muted text-sm max-w-md mx-auto">
          Full stock management with lot-level tracking, status workflows, pricing, and agent assignments.
        </p>
      </div>
    </div>
  );
}
