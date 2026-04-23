import { db } from '@/lib/db';

const profiles = [
  {
    email: 'sarah@example.com',
    name: 'Sarah',
    bio: 'Coffee lover and adventure seeker. Looking for someone to explore the world with! ☕️🌍',
    age: 26,
    gender: 'female',
    interests: 'Travel, Photography, Coffee, Hiking, Yoga',
    location: 'New York, NY',
    images: JSON.stringify(['/profile-images/sarah.png'])
  },
  {
    email: 'michael@example.com',
    name: 'Michael',
    bio: 'Tech enthusiast with a passion for cooking. Let me cook you dinner? 🍳💻',
    age: 28,
    gender: 'male',
    interests: 'Technology, Cooking, Gaming, Fitness, Music',
    location: 'San Francisco, CA',
    images: JSON.stringify(['/profile-images/michael.png'])
  },
  {
    email: 'emma@example.com',
    name: 'Emma',
    bio: 'Dog mom and bookworm. If you love dogs, we\'re already halfway there! 🐕📚',
    age: 25,
    gender: 'female',
    interests: 'Dogs, Reading, Wine Tasting, Gardening, Movies',
    location: 'Los Angeles, CA',
    images: JSON.stringify(['/profile-images/emma.png'])
  },
  {
    email: 'david@example.com',
    name: 'David',
    bio: 'Musician by night, software developer by day. Looking for harmony in all aspects of life 🎵💻',
    age: 30,
    gender: 'male',
    interests: 'Music, Coding, Concerts, Travel, Photography',
    location: 'Chicago, IL',
    images: JSON.stringify(['/profile-images/david.png'])
  },
  {
    email: 'jessica@example.com',
    name: 'Jessica',
    bio: 'Fitness coach and wellness advocate. Let\'s be better together! 💪🌱',
    age: 27,
    gender: 'female',
    interests: 'Fitness, Health, Meditation, Surfing, Sushi',
    location: 'Miami, FL',
    images: JSON.stringify(['/profile-images/jessica.png'])
  },
  {
    email: 'james@example.com',
    name: 'James',
    bio: 'Entrepreneur with a love for art galleries and fine dining. Life\'s too short for bad coffee ☕🎨',
    age: 29,
    gender: 'male',
    interests: 'Business, Art, Food, Travel, Wine',
    location: 'Seattle, WA',
    images: JSON.stringify(['/profile-images/james.png'])
  }
];

async function seedDatabase() {
  console.log('Seeding database with sample profiles...');

  for (const profileData of profiles) {
    try {
      // Create user
      const user = await db.user.create({
        data: {
          email: profileData.email,
          name: profileData.name
        }
      });

      // Create profile
      const profile = await db.profile.create({
        data: {
          userId: user.id,
          name: profileData.name,
          bio: profileData.bio,
          age: profileData.age,
          gender: profileData.gender,
          interests: profileData.interests,
          location: profileData.location,
          images: profileData.images
        }
      });

      console.log(`✓ Created profile for ${profileData.name} (ID: ${profile.id})`);
    } catch (error) {
      console.error(`✗ Failed to create profile for ${profileData.name}:`, error.message);
    }
  }

  console.log('\nDatabase seeding complete!');
}

seedDatabase()
  .catch(console.error)
  .finally(async () => {
    await db.$disconnect();
  });
