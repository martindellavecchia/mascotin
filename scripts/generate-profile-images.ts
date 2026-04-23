import ZAI from 'z-ai-web-dev-sdk';
import fs from 'fs';
import path from 'path';

const zai = await ZAI.create();
const outputDir = './public/profile-images';

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const profiles = [
  {
    name: 'Sarah',
    prompt: 'Professional portrait photo of a young woman with auburn hair, warm smile, natural lighting, friendly expression, dating app style, high quality',
    filename: 'sarah.png'
  },
  {
    name: 'Michael',
    prompt: 'Professional portrait photo of a young man with short dark hair, confident smile, casual attire, natural lighting, dating app style, high quality',
    filename: 'michael.png'
  },
  {
    name: 'Emma',
    prompt: 'Professional portrait photo of a young woman with blonde hair, friendly expression, outdoor setting, natural lighting, dating app style, high quality',
    filename: 'emma.png'
  },
  {
    name: 'David',
    prompt: 'Professional portrait photo of a young man with curly brown hair, warm smile, casual style, natural lighting, dating app style, high quality',
    filename: 'david.png'
  },
  {
    name: 'Jessica',
    prompt: 'Professional portrait photo of a young woman with dark hair, bright smile, modern style, studio lighting, dating app style, high quality',
    filename: 'jessica.png'
  },
  {
    name: 'James',
    prompt: 'Professional portrait photo of a young man with short light brown hair, friendly expression, casual smart attire, natural lighting, dating app style, high quality',
    filename: 'james.png'
  }
];

console.log('Generating profile images...');

for (const profile of profiles) {
  try {
    console.log(`Generating ${profile.name}...`);

    const response = await zai.images.generations.create({
      prompt: profile.prompt,
      size: '768x1344' // Portrait size for profile photos
    });

    const imageBase64 = response.data[0].base64;
    const buffer = Buffer.from(imageBase64, 'base64');
    const filepath = path.join(outputDir, profile.filename);
    fs.writeFileSync(filepath, buffer);

    console.log(`✓ Generated ${profile.name}: ${profile.filename}`);
  } catch (error) {
    console.error(`✗ Failed to generate ${profile.name}:`, error.message);
  }
}

console.log('\nProfile image generation complete!');
