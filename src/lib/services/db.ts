import { createClient } from '@/lib/supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = any;

export interface ServiceFeature {
  title: string;
  description: string;
  icon: string;
}

export interface ServiceStep {
  step: number;
  title: string;
  description: string;
}

export interface ServiceUseCase {
  title: string;
  description: string;
}

export interface ServiceTestimonial {
  name: string;
  role: string;
  content: string;
  rating: number;
}

export interface Service {
  id: string;
  slug: string;
  name: string;
  short_description: string;
  long_description: string | null;
  icon: string | null;
  hero_title: string;
  hero_subtitle: string | null;
  hero_image_url: string | null;
  features: ServiceFeature[];
  how_it_works: ServiceStep[];
  use_cases: ServiceUseCase[];
  testimonials: ServiceTestimonial[];
  cta_title: string;
  cta_subtitle: string;
  cta_button_text: string;
  cta_button_link: string;
  meta_title: string | null;
  meta_description: string | null;
  is_featured: boolean;
  is_published: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

/**
 * Get all published services
 */
export async function getPublishedServices(): Promise<Service[]> {
  const supabase = await createClient();
  
  const { data, error } = await (supabase as AnySupabaseClient)
    .from('services')
    .select('*')
    .eq('is_published', true)
    .order('sort_order', { ascending: true });
  
  if (error) {
    console.error('Error fetching services:', error);
    return [];
  }
  
  return data as Service[];
}

/**
 * Get featured services (for navbar dropdown)
 */
export async function getFeaturedServices(limit: number = 4): Promise<Service[]> {
  const supabase = await createClient();
  
  const { data, error } = await (supabase as AnySupabaseClient)
    .from('services')
    .select('*')
    .eq('is_published', true)
    .eq('is_featured', true)
    .order('sort_order', { ascending: true })
    .limit(limit);
  
  if (error) {
    console.error('Error fetching featured services:', error);
    return [];
  }
  
  return data as Service[];
}

/**
 * Get a service by slug
 */
export async function getServiceBySlug(slug: string): Promise<Service | null> {
  const supabase = await createClient();
  
  const { data, error } = await (supabase as AnySupabaseClient)
    .from('services')
    .select('*')
    .eq('slug', slug)
    .eq('is_published', true)
    .single();
  
  if (error) {
    console.error('Error fetching service:', error);
    return null;
  }
  
  return data as Service;
}

/**
 * Get all services (for admin)
 */
export async function getAllServices(): Promise<Service[]> {
  const supabase = await createClient();
  
  const { data, error } = await (supabase as AnySupabaseClient)
    .from('services')
    .select('*')
    .order('sort_order', { ascending: true });
  
  if (error) {
    console.error('Error fetching all services:', error);
    return [];
  }
  
  return data as Service[];
}








