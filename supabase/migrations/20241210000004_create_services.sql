-- ===========================================
-- SERVICES TABLE
-- Dynamic service landing pages for SEO and marketing
-- ===========================================

-- Create services table
CREATE TABLE IF NOT EXISTS public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  short_description TEXT NOT NULL,
  long_description TEXT,
  icon TEXT, -- emoji or icon name
  hero_title TEXT NOT NULL,
  hero_subtitle TEXT,
  hero_image_url TEXT,
  
  -- Features section (JSON array)
  features JSONB DEFAULT '[]'::jsonb,
  
  -- How it works section (JSON array of steps)
  how_it_works JSONB DEFAULT '[]'::jsonb,
  
  -- Use cases section (JSON array)
  use_cases JSONB DEFAULT '[]'::jsonb,
  
  -- Testimonials/ratings (JSON array)
  testimonials JSONB DEFAULT '[]'::jsonb,
  
  -- CTA configuration
  cta_title TEXT DEFAULT 'Get Started Today',
  cta_subtitle TEXT DEFAULT 'Transform your content with AI-powered voice generation',
  cta_button_text TEXT DEFAULT 'Try It Free',
  cta_button_link TEXT DEFAULT '/auth/signup',
  
  -- SEO
  meta_title TEXT,
  meta_description TEXT,
  
  -- Display settings
  is_featured BOOLEAN DEFAULT false,
  is_published BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_services_slug ON public.services(slug);
CREATE INDEX IF NOT EXISTS idx_services_published ON public.services(is_published);
CREATE INDEX IF NOT EXISTS idx_services_featured ON public.services(is_featured);
CREATE INDEX IF NOT EXISTS idx_services_sort ON public.services(sort_order);

-- Enable RLS
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

-- Public read access for published services
CREATE POLICY "Anyone can view published services"
  ON public.services
  FOR SELECT
  USING (is_published = true);

-- Admin full access (using profiles role)
CREATE POLICY "Admins can manage services"
  ON public.services
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_services_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER services_updated_at
  BEFORE UPDATE ON public.services
  FOR EACH ROW
  EXECUTE FUNCTION update_services_updated_at();

-- ===========================================
-- SEED INITIAL SERVICES
-- ===========================================

INSERT INTO public.services (
  slug,
  name,
  short_description,
  long_description,
  icon,
  hero_title,
  hero_subtitle,
  features,
  how_it_works,
  use_cases,
  testimonials,
  cta_title,
  cta_subtitle,
  meta_title,
  meta_description,
  is_featured,
  sort_order
) VALUES 
-- YouTube Videos
(
  'youtube-videos',
  'YouTube Videos',
  'Create professional voiceovers for your YouTube content',
  'Transform your YouTube videos with natural-sounding AI voiceovers. Perfect for tutorials, reviews, documentaries, and any video content that needs professional narration without expensive voice actors.',
  '🎬',
  'AI Voiceovers for YouTube Videos',
  'Create engaging, professional voiceovers for your YouTube content in minutes, not hours',
  '[
    {"title": "Natural Sounding Voices", "description": "Over 100+ realistic AI voices that sound human", "icon": "🎙️"},
    {"title": "Multi-Language Support", "description": "Create content in 50+ languages to reach global audiences", "icon": "🌍"},
    {"title": "Fast Turnaround", "description": "Generate voiceovers in seconds, not days", "icon": "⚡"},
    {"title": "Cost Effective", "description": "Save thousands compared to hiring voice actors", "icon": "💰"}
  ]'::jsonb,
  '[
    {"step": 1, "title": "Paste Your Script", "description": "Copy your video script or write directly in our editor"},
    {"step": 2, "title": "Choose Your Voice", "description": "Select from 100+ AI voices in different styles and languages"},
    {"step": 3, "title": "Generate & Download", "description": "Click generate and download your professional voiceover"}
  ]'::jsonb,
  '[
    {"title": "Tutorial Videos", "description": "Clear explanations for how-to content"},
    {"title": "Product Reviews", "description": "Professional narration for review videos"},
    {"title": "Documentary Style", "description": "Engaging narration for documentary content"},
    {"title": "Channel Intros", "description": "Consistent branding across all your videos"}
  ]'::jsonb,
  '[
    {"name": "Alex M.", "role": "YouTube Creator", "content": "Cut my video production time in half. The voices sound incredibly natural!", "rating": 5},
    {"name": "Sarah K.", "role": "Content Creator", "content": "Finally found an affordable solution for professional voiceovers.", "rating": 5},
    {"name": "Mike R.", "role": "Tech Reviewer", "content": "My subscribers love the new voice quality. Highly recommend!", "rating": 5}
  ]'::jsonb,
  'Start Creating YouTube Voiceovers',
  'Join thousands of creators using AI TextSpeak for their YouTube content',
  'AI Voiceover for YouTube Videos | AI TextSpeak',
  'Create professional AI voiceovers for your YouTube videos. Natural sounding voices, 50+ languages, instant generation. Try free today!',
  true,
  1
),

-- Podcasts
(
  'podcasts',
  'Podcasts',
  'Generate intro, outro, and full episode narration for podcasts',
  'Elevate your podcast with AI-generated voice content. Perfect for intros, outros, ad reads, or even full episode narration. Maintain consistency across all episodes with your chosen AI voice.',
  '🎙️',
  'AI Voice Generation for Podcasts',
  'Create professional podcast intros, outros, and narration with AI voices',
  '[
    {"title": "Consistent Quality", "description": "Same voice quality every episode, no scheduling conflicts", "icon": "✨"},
    {"title": "Quick Ad Reads", "description": "Generate sponsor messages in seconds", "icon": "📢"},
    {"title": "Multiple Formats", "description": "Export in any audio format you need", "icon": "🎵"},
    {"title": "Unlimited Revisions", "description": "Regenerate until it sounds perfect", "icon": "🔄"}
  ]'::jsonb,
  '[
    {"step": 1, "title": "Write Your Script", "description": "Enter your podcast script, intro, or ad copy"},
    {"step": 2, "title": "Select Voice Style", "description": "Choose a voice that matches your podcast vibe"},
    {"step": 3, "title": "Export Audio", "description": "Download high-quality audio ready for your podcast"}
  ]'::jsonb,
  '[
    {"title": "Podcast Intros", "description": "Professional opening sequences"},
    {"title": "Episode Narration", "description": "Full or partial episode voiceovers"},
    {"title": "Ad Reads", "description": "Quick sponsor message generation"},
    {"title": "Show Outros", "description": "Consistent closing segments"}
  ]'::jsonb,
  '[
    {"name": "David L.", "role": "Podcast Host", "content": "Perfect for my daily podcast. Consistent quality every single episode.", "rating": 5},
    {"name": "Emma W.", "role": "True Crime Podcaster", "content": "The dramatic voices add so much to my storytelling!", "rating": 5},
    {"name": "James T.", "role": "Business Podcast", "content": "Saved me hours every week on ad reads and intros.", "rating": 5}
  ]'::jsonb,
  'Launch Your Podcast Today',
  'Professional AI voices for podcasters of all levels',
  'AI Voice Generator for Podcasts | AI TextSpeak',
  'Create professional podcast intros, outros, and narration with AI voices. Perfect quality every episode. Start free!',
  true,
  2
),

-- Audiobooks
(
  'audiobooks',
  'Audiobooks',
  'Convert your books and stories into professional audiobooks',
  'Transform your written content into captivating audiobooks. Perfect for authors, publishers, and content creators who want to reach the growing audiobook market without expensive production costs.',
  '📚',
  'Create Audiobooks with AI Narration',
  'Turn your books into professional audiobooks with natural AI voices',
  '[
    {"title": "Long-Form Content", "description": "Handle books of any length with consistent quality", "icon": "📖"},
    {"title": "Character Voices", "description": "Different voices for different characters", "icon": "🎭"},
    {"title": "Chapter Management", "description": "Organize audio by chapters for easy navigation", "icon": "📑"},
    {"title": "Commercial Rights", "description": "Full rights to sell your audiobooks", "icon": "💼"}
  ]'::jsonb,
  '[
    {"step": 1, "title": "Upload Your Book", "description": "Paste chapters or upload your manuscript"},
    {"step": 2, "title": "Assign Voices", "description": "Choose narrator voice and character voices"},
    {"step": 3, "title": "Generate Audiobook", "description": "Create chapter by chapter, export complete audiobook"}
  ]'::jsonb,
  '[
    {"title": "Fiction Books", "description": "Novels, short stories, and creative writing"},
    {"title": "Non-Fiction", "description": "Educational content, self-help, business books"},
    {"title": "Children''s Books", "description": "Engaging narration for young listeners"},
    {"title": "Educational Material", "description": "Textbooks and learning content"}
  ]'::jsonb,
  '[
    {"name": "Jennifer A.", "role": "Self-Published Author", "content": "Finally made my book available as an audiobook. Sales doubled!", "rating": 5},
    {"name": "Robert K.", "role": "Publisher", "content": "We produce 10x more audiobooks now at a fraction of the cost.", "rating": 5},
    {"name": "Lisa M.", "role": "Children''s Author", "content": "The voices bring my characters to life beautifully.", "rating": 5}
  ]'::jsonb,
  'Create Your Audiobook Now',
  'Join authors worldwide using AI to reach audiobook listeners',
  'AI Audiobook Creation | AI TextSpeak',
  'Convert your books into professional audiobooks with AI narration. Natural voices, chapter management, commercial rights. Start today!',
  true,
  3
),

-- E-Learning
(
  'e-learning',
  'E-Learning',
  'Create engaging voiceovers for online courses and training',
  'Enhance your e-learning content with professional AI narration. Perfect for online courses, corporate training, educational videos, and instructional content.',
  '🎓',
  'AI Voices for E-Learning Content',
  'Create professional narration for courses and training materials',
  '[
    {"title": "Clear Pronunciation", "description": "Perfect for educational content that needs clarity", "icon": "🔊"},
    {"title": "Multiple Languages", "description": "Translate and narrate in 50+ languages", "icon": "🌐"},
    {"title": "Bulk Processing", "description": "Generate multiple lessons at once", "icon": "📦"},
    {"title": "SCORM Compatible", "description": "Export audio ready for LMS platforms", "icon": "🎯"}
  ]'::jsonb,
  '[
    {"step": 1, "title": "Prepare Your Script", "description": "Enter your lesson content or course script"},
    {"step": 2, "title": "Choose Instructor Voice", "description": "Select a clear, professional voice for learning"},
    {"step": 3, "title": "Export for Your LMS", "description": "Download and integrate with your learning platform"}
  ]'::jsonb,
  '[
    {"title": "Online Courses", "description": "Full course narration for platforms like Udemy"},
    {"title": "Corporate Training", "description": "Employee onboarding and training videos"},
    {"title": "Tutorial Videos", "description": "Step-by-step instructional content"},
    {"title": "Explainer Videos", "description": "Concept explanations and demonstrations"}
  ]'::jsonb,
  '[
    {"name": "Dr. Susan P.", "role": "Online Instructor", "content": "My students love the clear, consistent narration across all lessons.", "rating": 5},
    {"name": "Mark H.", "role": "Training Manager", "content": "Reduced our training video production time by 80%.", "rating": 5},
    {"name": "Anna C.", "role": "Course Creator", "content": "Perfect for creating courses in multiple languages quickly.", "rating": 5}
  ]'::jsonb,
  'Enhance Your E-Learning Content',
  'Professional AI narration for educators and trainers',
  'AI Voice for E-Learning & Online Courses | AI TextSpeak',
  'Create professional e-learning narration with AI voices. Perfect for online courses, corporate training, and educational content.',
  true,
  4
),

-- Commercials & Ads
(
  'commercials',
  'Commercials & Ads',
  'Professional voiceovers for advertisements and commercials',
  'Create compelling commercial voiceovers for your advertising campaigns. From social media ads to radio spots, get professional-quality voice content instantly.',
  '📺',
  'AI Voiceovers for Commercials',
  'Create compelling ad voiceovers that convert',
  '[
    {"title": "Multiple Styles", "description": "Energetic, calm, professional - any tone you need", "icon": "🎨"},
    {"title": "Quick Iterations", "description": "Test different versions in minutes", "icon": "⚡"},
    {"title": "Broadcast Quality", "description": "Studio-quality audio output", "icon": "🎤"},
    {"title": "A/B Testing", "description": "Create variants for testing easily", "icon": "📊"}
  ]'::jsonb,
  '[
    {"step": 1, "title": "Enter Ad Copy", "description": "Paste your commercial script"},
    {"step": 2, "title": "Select Voice & Tone", "description": "Choose the perfect voice for your brand"},
    {"step": 3, "title": "Generate & Launch", "description": "Download and use in your ad campaigns"}
  ]'::jsonb,
  '[
    {"title": "Social Media Ads", "description": "Facebook, Instagram, TikTok ad voiceovers"},
    {"title": "Radio Commercials", "description": "Professional radio ad narration"},
    {"title": "TV Spots", "description": "Television commercial voiceovers"},
    {"title": "Promo Videos", "description": "Product and service promotional content"}
  ]'::jsonb,
  '[
    {"name": "Chris M.", "role": "Marketing Director", "content": "We produce 5x more ad variants now for A/B testing.", "rating": 5},
    {"name": "Jessica L.", "role": "Agency Owner", "content": "Game changer for our small agency. Client love the quality.", "rating": 5},
    {"name": "Tom B.", "role": "E-commerce Owner", "content": "My product videos finally have professional voiceovers!", "rating": 5}
  ]'::jsonb,
  'Create Your Ad Voiceover',
  'Professional voices for advertising that converts',
  'AI Voiceover for Commercials & Ads | AI TextSpeak',
  'Create professional commercial voiceovers with AI. Perfect for social media ads, radio spots, and promotional videos.',
  false,
  5
),

-- IVR & Phone Systems
(
  'ivr-phone-systems',
  'IVR & Phone Systems',
  'Professional voice prompts for phone systems and IVR',
  'Create professional voice prompts for your business phone system. From hold messages to IVR menus, ensure every caller gets a professional experience.',
  '📞',
  'AI Voice for IVR & Phone Systems',
  'Professional voice prompts for business communications',
  '[
    {"title": "Consistent Brand Voice", "description": "Same professional tone across all prompts", "icon": "🏢"},
    {"title": "Easy Updates", "description": "Change prompts anytime without re-recording", "icon": "🔄"},
    {"title": "Multiple Languages", "description": "Serve customers in their language", "icon": "🌍"},
    {"title": "Telephony Formats", "description": "Export in any format your system needs", "icon": "📱"}
  ]'::jsonb,
  '[
    {"step": 1, "title": "Write Your Prompts", "description": "Enter all your IVR menu options and messages"},
    {"step": 2, "title": "Choose Professional Voice", "description": "Select a clear, trustworthy voice"},
    {"step": 3, "title": "Export & Upload", "description": "Download and upload to your phone system"}
  ]'::jsonb,
  '[
    {"title": "IVR Menus", "description": "Press 1 for sales, 2 for support..."},
    {"title": "Hold Messages", "description": "Professional on-hold content"},
    {"title": "Voicemail Greetings", "description": "Business voicemail messages"},
    {"title": "After Hours", "description": "Closed office announcements"}
  ]'::jsonb,
  '[
    {"name": "Patricia R.", "role": "Office Manager", "content": "Our phone system sounds so professional now. Easy to update too!", "rating": 5},
    {"name": "Steven G.", "role": "Call Center Director", "content": "Updated all our IVR prompts in an afternoon. Used to take weeks.", "rating": 5},
    {"name": "Maria S.", "role": "Small Business Owner", "content": "Customers think we are a much bigger company now!", "rating": 5}
  ]'::jsonb,
  'Upgrade Your Phone System',
  'Professional IVR voices that impress callers',
  'AI Voice for IVR & Phone Systems | AI TextSpeak',
  'Create professional IVR prompts and phone system voices with AI. Easy updates, multiple languages, any format.',
  false,
  6
);








