import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import MessagesClientShell from '@/components/messages/MessagesClientShell';
import { authOptions } from '@/lib/auth';
import { getMessagesBootstrapData } from '@/lib/server/messages';

export default async function MessagesPage({
  searchParams,
}: {
  searchParams?: Promise<{ matchId?: string; groupId?: string }>;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect('/login');
  }

  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const data = await getMessagesBootstrapData(session.user.id);
  const initialSelectedId =
    resolvedSearchParams?.matchId || resolvedSearchParams?.groupId || null;
  const initialSelectedType = resolvedSearchParams?.groupId
    ? 'group'
    : resolvedSearchParams?.matchId
      ? 'match'
      : null;

  return (
    <MessagesClientShell
      session={session}
      initialMatches={data.matches}
      initialGroups={data.groups}
      initialSelectedId={initialSelectedId}
      initialSelectedType={initialSelectedType}
    />
  );
}
