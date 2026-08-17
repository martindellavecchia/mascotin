import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import RescueCaseDetail from '@/components/help/RescueCaseDetail';
import { authOptions } from '@/lib/auth';

export default async function FosterCasePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ contact?: string; need?: string; kind?: string; offer?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect('/login');
  const { id } = await params;
  const query = await searchParams;
  return (
    <RescueCaseDetail
      caseId={id}
      initialContactOpen={query.contact === '1'}
      initialNeedType={query.need}
      initialContactKind={query.kind}
      initialOfferId={query.offer}
    />
  );
}
