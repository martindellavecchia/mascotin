const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        console.log('Fetching event posts...');
        const posts = await prisma.post.findMany({
            where: {
                postType: 'event',
                eventId: null,
                eventDate: { not: null }
            }
        });

        console.log(`Found ${posts.length} unlinked event posts.`);

        for (const post of posts) {
            console.log(`Processing post: ${post.id}`);

            // Find event
            const event = await prisma.event.findFirst({
                where: {
                    authorId: post.authorId,
                    date: post.eventDate
                }
            });

            if (event) {
                console.log(`Linking to Event: ${event.id}`);
                await prisma.post.update({
                    where: { id: post.id },
                    data: { eventId: event.id }
                });
            } else {
                console.log('No matching event found.');
            }
        }

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
