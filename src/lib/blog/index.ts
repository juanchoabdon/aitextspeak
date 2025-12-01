import type { BlogPost, BlogPostMeta } from '@/types';

/**
 * Blog posts data
 * In the future, this can be migrated to MDX files or a CMS
 */
const blogPosts: BlogPost[] = [
  {
    slug: 'best-ai-voice-generator-for-youtube',
    title: 'Best AI Voice Generator for YouTube in 2024',
    description: 'Discover the top AI voice generators for creating professional YouTube voiceovers. Compare features, pricing, and quality to find the perfect tool for your content.',
    content: `
      <h2>Why Use AI Voice Generators for YouTube?</h2>
      <p>
        Creating engaging YouTube content requires high-quality audio. AI voice generators have revolutionized 
        how creators produce voiceovers, offering natural-sounding speech without expensive studio equipment 
        or professional voice actors.
      </p>
      
      <h2>Key Features to Look For</h2>
      <p>When choosing an AI voice generator for YouTube, consider these essential features:</p>
      <ul>
        <li><strong>Natural Sound Quality</strong> - The voice should sound human, not robotic</li>
        <li><strong>Multiple Voice Options</strong> - Different tones, accents, and genders</li>
        <li><strong>Customization</strong> - Control over speed, pitch, and emphasis</li>
        <li><strong>Commercial License</strong> - Rights to use in monetized content</li>
        <li><strong>Fast Generation</strong> - Quick turnaround for efficient workflows</li>
      </ul>
      
      <h2>Why AI TextSpeak Stands Out</h2>
      <p>
        AI TextSpeak offers all these features and more. Our advanced neural network technology produces 
        voices that are virtually indistinguishable from human speakers. With 50+ voices across multiple 
        languages and accents, you can find the perfect voice for any type of content.
      </p>
      
      <h3>Perfect for Various YouTube Content Types</h3>
      <ul>
        <li>Tutorial and educational videos</li>
        <li>Product reviews and comparisons</li>
        <li>Documentary-style content</li>
        <li>Listicles and compilations</li>
        <li>News and current events coverage</li>
      </ul>
      
      <h2>Getting Started</h2>
      <p>
        Ready to transform your YouTube content with professional AI voiceovers? Sign up for AI TextSpeak 
        today and get 5,000 free characters to try out our technology. No credit card required.
      </p>
    `,
    publishedAt: '2024-01-15',
    updatedAt: '2024-11-01',
    author: 'AI TextSpeak Team',
    tags: ['YouTube', 'AI Voice', 'Tutorial'],
    image: '/blog/youtube-voice.jpg',
  },
  {
    slug: 'ai-text-to-speech-audiobooks',
    title: 'How to Create Audiobooks with AI Text-to-Speech',
    description: 'Learn how to use AI text-to-speech technology to create professional audiobooks. Step-by-step guide for authors and publishers.',
    content: `
      <h2>The Rise of AI Audiobooks</h2>
      <p>
        The audiobook market is booming, but traditional production costs can be prohibitive for independent 
        authors and small publishers. AI text-to-speech technology is changing the game, making audiobook 
        production accessible to everyone.
      </p>
      
      <h2>Benefits of AI-Generated Audiobooks</h2>
      <ul>
        <li><strong>Cost-Effective</strong> - Fraction of the cost of human narrators</li>
        <li><strong>Fast Production</strong> - Complete books in hours, not weeks</li>
        <li><strong>Consistent Quality</strong> - No recording session variations</li>
        <li><strong>Easy Updates</strong> - Re-generate chapters when needed</li>
        <li><strong>Multiple Languages</strong> - Reach global audiences easily</li>
      </ul>
      
      <h2>Step-by-Step Guide</h2>
      
      <h3>1. Prepare Your Manuscript</h3>
      <p>
        Before converting your text, ensure it's properly formatted. Remove any formatting that won't 
        translate well to audio, such as tables or complex layouts. Add pronunciation guides for 
        unusual names or terms.
      </p>
      
      <h3>2. Choose the Right Voice</h3>
      <p>
        Select a voice that matches your book's genre and tone. A thriller might benefit from a deeper, 
        more dramatic voice, while a romance novel might call for something warmer and more intimate.
      </p>
      
      <h3>3. Optimize for Natural Speech</h3>
      <p>
        Use SSML tags or our built-in controls to add pauses, emphasis, and natural breathing patterns. 
        This makes the audiobook sound more human and engaging.
      </p>
      
      <h3>4. Review and Edit</h3>
      <p>
        Listen through the generated audio and make adjustments as needed. You can re-generate specific 
        sections without redoing the entire book.
      </p>
      
      <h2>Best Practices</h2>
      <ul>
        <li>Break long chapters into smaller sections for easier management</li>
        <li>Use consistent voice settings throughout the book</li>
        <li>Add extra pauses between chapters</li>
        <li>Consider different voices for different characters in fiction</li>
      </ul>
      
      <h2>Get Started Today</h2>
      <p>
        AI TextSpeak makes audiobook creation simple and affordable. Our Pro plan includes unlimited 
        character generation and the high-quality audio you need for professional audiobooks.
      </p>
    `,
    publishedAt: '2024-02-20',
    updatedAt: '2024-10-15',
    author: 'AI TextSpeak Team',
    tags: ['Audiobooks', 'Publishing', 'Guide'],
    image: '/blog/audiobooks.jpg',
  },
];

/**
 * Get all blog posts (metadata only)
 */
export async function getBlogPosts(): Promise<BlogPostMeta[]> {
  return blogPosts
    .map(({ slug, title, description, publishedAt, tags, image }) => ({
      slug,
      title,
      description,
      publishedAt,
      tags,
      image,
    }))
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
}

/**
 * Get a single blog post by slug
 */
export async function getBlogPost(slug: string): Promise<BlogPost | null> {
  const post = blogPosts.find((p) => p.slug === slug);
  return post || null;
}

/**
 * Get related posts (same tags)
 */
export async function getRelatedPosts(slug: string, limit = 3): Promise<BlogPostMeta[]> {
  const currentPost = await getBlogPost(slug);
  if (!currentPost || !currentPost.tags) {
    return [];
  }

  const allPosts = await getBlogPosts();
  return allPosts
    .filter((post) => post.slug !== slug)
    .filter((post) => post.tags?.some((tag) => currentPost.tags?.includes(tag)))
    .slice(0, limit);
}

