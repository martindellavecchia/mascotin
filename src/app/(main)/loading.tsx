export default function MainLoading() {
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50">
      <div className="container mx-auto px-4 py-6 space-y-4 animate-pulse">
        <div className="h-10 bg-white border border-slate-200 rounded-lg w-full max-w-md" />
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] xl:grid-cols-[280px_1fr_320px] gap-6">
          <div className="hidden lg:block h-72 bg-white border border-slate-200 rounded-lg" />
          <div className="space-y-4">
            <div className="h-40 bg-white border border-slate-200 rounded-lg" />
            <div className="h-40 bg-white border border-slate-200 rounded-lg" />
            <div className="h-40 bg-white border border-slate-200 rounded-lg" />
          </div>
          <div className="hidden xl:block space-y-4">
            <div className="h-32 bg-white border border-slate-200 rounded-lg" />
            <div className="h-40 bg-white border border-slate-200 rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}
