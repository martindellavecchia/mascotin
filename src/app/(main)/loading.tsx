export default function MainLoading() {
  return (
    <div className="min-h-[calc(100dvh-4rem)] bg-background lg:min-h-dvh" role="status" aria-live="polite">
      <span className="sr-only">Cargando…</span>
      <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6 motion-safe:animate-pulse sm:px-6 lg:py-10" aria-hidden="true">
        <div className="space-y-3 border-b border-border pb-5">
          <div className="h-8 w-48 rounded-md bg-muted" />
          <div className="h-4 w-full max-w-sm rounded-md bg-muted" />
        </div>
        <div className="h-44 rounded-lg border border-border bg-surface" />
        <div className="h-28 rounded-lg border border-border bg-surface" />
        <div className="h-28 rounded-lg border border-border bg-surface" />
      </div>
    </div>
  );
}
