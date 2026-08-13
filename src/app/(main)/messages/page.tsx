import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import MessagesClientShell from '@/components/messages/MessagesClientShell';
import { authOptions } from '@/lib/auth';
import { getMessagesBootstrapData } from '@/lib/server/messages';

export default async function MessagesPage() {
  const session = await getServerSession(authOptions);

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
