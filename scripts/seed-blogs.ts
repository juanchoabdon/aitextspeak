import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Read .env.local manually
const envPath = resolve(process.cwd(), '.env.local');
const envContent = readFileSync(envPath, 'utf-8');
const envVars: Record<string, string> = {};
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length > 0) {
    envVars[key.trim()] = valueParts.join('=').trim();
  }
});

const supabase = createClient(
  envVars.NEXT_PUBLIC_SUPABASE_URL,
  envVars.SUPABASE_SERVICE_ROLE_KEY
);

const blogPosts = [
  {
    slug: 'best-ai-voice-generator-for-youtube',
    title: 'Best AI Voice Generator for YouTube in 2024',
    description: 'Discover the top AI voice generators perfect for creating engaging YouTube content. Compare features, quality, and pricing to find your ideal solution.',
    content: `
<h2>Why Use AI Voice Generators for YouTube?</h2>
<p>Creating engaging YouTube content requires high-quality voiceovers, but not everyone has access to professional recording equipment or the perfect voice for their niche. AI voice generators have revolutionized content creation by providing natural-sounding voices that can transform your scripts into professional narration in seconds.</p>

<h2>What Makes a Great AI Voice Generator?</h2>
<p>When choosing an AI voice generator for YouTube, consider these key factors:</p>
<ul>
  <li><strong>Natural Sound Quality:</strong> The voice should sound human-like, with proper intonation and emotion</li>
  <li><strong>Voice Variety:</strong> Multiple voices and accents to match your content style</li>
  <li><strong>Speed and Efficiency:</strong> Quick generation times for productive workflow</li>
  <li><strong>Commercial Rights:</strong> Ensure you can monetize content using the generated voices</li>
  <li><strong>Customization Options:</strong> Control over speed, pitch, and emphasis</li>
</ul>

<h2>Top Benefits for YouTube Creators</h2>
<p>Using AI voice generation for your YouTube channel offers numerous advantages:</p>
<ul>
  <li>Create content faster without scheduling recording sessions</li>
  <li>Maintain consistent audio quality across all videos</li>
  <li>Scale your content production without hiring voice actors</li>
  <li>Easily create content in multiple languages</li>
  <li>Perfect for faceless YouTube channels</li>
</ul>

<h2>How to Get Started</h2>
<p>Getting started with AI voice generation is simple:</p>
<ol>
  <li>Write your script or outline</li>
  <li>Choose a voice that matches your brand</li>
  <li>Generate your voiceover</li>
  <li>Download and add to your video editor</li>
  <li>Publish and grow your channel!</li>
</ol>

<h2>AI TextSpeak: Your YouTube Voice Solution</h2>
<p>AI TextSpeak offers studio-quality AI voices specifically optimized for YouTube content. With our neural voice technology, your videos will sound professional and engaging, helping you grow your audience and monetize your channel.</p>

<p>Whether you're creating tutorials, documentaries, product reviews, or entertainment content, AI TextSpeak provides the voices you need to succeed on YouTube.</p>
    `,
    tags: ['YouTube', 'AI Voice', 'Content Creation', 'Tutorial'],
    author_name: 'AI TextSpeak Team',
    status: 'published',
    published_at: new Date('2024-01-15').toISOString(),
  },
  {
    slug: 'ai-text-to-speech-audiobooks',
    title: 'How to Create Audiobooks with AI Text-to-Speech',
    description: 'Learn how to transform your written content into professional audiobooks using AI text-to-speech technology. A complete guide for authors and publishers.',
    content: `
<h2>The Audiobook Revolution</h2>
<p>Audiobooks have exploded in popularity, with millions of listeners consuming content during commutes, workouts, and daily activities. For authors and publishers, this represents a massive opportunity—but traditional audiobook production can be expensive and time-consuming.</p>

<p>AI text-to-speech technology is changing the game, making audiobook creation accessible to everyone.</p>

<h2>Benefits of AI-Generated Audiobooks</h2>
<p>Using AI for audiobook creation offers significant advantages:</p>
<ul>
  <li><strong>Cost Effective:</strong> Fraction of the cost compared to hiring voice actors</li>
  <li><strong>Fast Production:</strong> Create hours of audio content in minutes</li>
  <li><strong>Consistent Quality:</strong> No variations between recording sessions</li>
  <li><strong>Easy Updates:</strong> Re-generate sections when content changes</li>
  <li><strong>Multiple Languages:</strong> Reach global audiences with translations</li>
</ul>

<h2>Step-by-Step Audiobook Creation</h2>
<p>Follow these steps to create your AI-powered audiobook:</p>

<h3>1. Prepare Your Manuscript</h3>
<p>Clean up your text for optimal voice synthesis. Remove special formatting, ensure proper punctuation, and consider adding pronunciation guides for unusual names or terms.</p>

<h3>2. Choose Your Voice</h3>
<p>Select a voice that matches your book's tone and genre. Consider:</p>
<ul>
  <li>Fiction: Choose voices that match your narrator's personality</li>
  <li>Non-fiction: Professional, authoritative voices work best</li>
  <li>Children's books: Warm, engaging voices with varied expression</li>
</ul>

<h3>3. Generate Chapter by Chapter</h3>
<p>Break your book into chapters for easier management. This allows for better quality control and easier editing.</p>

<h3>4. Review and Edit</h3>
<p>Listen through your generated audio and make adjustments as needed. Most AI tools allow you to regenerate specific sections.</p>

<h3>5. Export and Distribute</h3>
<p>Export your final audio files and distribute through platforms like Audible, Apple Books, or your own website.</p>

<h2>Best Practices for AI Audiobooks</h2>
<ul>
  <li>Use proper punctuation to control pacing and pauses</li>
  <li>Test different voices before committing to one</li>
  <li>Consider chapter-specific voices for different characters</li>
  <li>Add intro and outro music for a professional touch</li>
  <li>Include a human review for quality assurance</li>
</ul>

<h2>Start Creating Today</h2>
<p>With AI TextSpeak, you can transform any written content into engaging audio. Our advanced neural voices deliver natural-sounding narration that keeps listeners engaged from start to finish.</p>

<p>Whether you're an independent author, publisher, or content creator, AI text-to-speech makes audiobook production accessible and affordable.</p>
    `,
    tags: ['Audiobooks', 'Text-to-Speech', 'Publishing', 'Authors'],
    author_name: 'AI TextSpeak Team',
    status: 'published',
    published_at: new Date('2024-02-10').toISOString(),
  },
];

async function seedBlogs() {
  console.log('🌱 Seeding blog posts...\n');

  for (const post of blogPosts) {
    const { data, error } = await supabase
      .from('blog_posts')
      .upsert(post, { onConflict: 'slug' })
      .select('id, title')
      .single();

    if (error) {
      console.error(`❌ Error inserting "${post.title}":`, error.message);
    } else {
      console.log(`✅ Created: "${data.title}"`);
    }
  }

  console.log('\n🎉 Blog seeding complete!');
}

seedBlogs();

