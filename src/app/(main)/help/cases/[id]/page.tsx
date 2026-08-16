import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import RescueCaseDetail from '@/components/help/RescueCaseDetail';
import { authOptions } from '@/lib/auth';

export default async function RescueCasePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect('/login');
  const { id } = await params;

  return <RescueCaseDetail caseId={id} />;
}
