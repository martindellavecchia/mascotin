import PublicHeader from '@/components/PublicHeader';

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen min-h-svh flex-col bg-background">
      <PublicHeader />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
