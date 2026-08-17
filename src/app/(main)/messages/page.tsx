import { redirect } from 'next/navigation';
import MessagesClientShell from '@/components/messages/MessagesClientShell';
import { getMessagesBootstrapData } from '@/lib/server/messages';
import { getCachedSession } from '@/lib/session';

export default async function MessagesPage() {
  const session = await getCachedSession();

  if (!session?.user?.id) {
    redirect('/login');
  }

  // Do not read searchParams in this Server Component: changing ?matchId=
  // would re-run bootstrap and freeze conversation switching.
  const data = await getMessagesBootstrapData(session.user.id);

  return (
    <MessagesClientShell
      session={session}
      initialMatches={data.matches}
      initialGroups={data.groups}
    />
  );
}
