'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { Service, ServiceFeature, ServiceStep, ServiceUseCase, ServiceTestimonial } from './db';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = any;

export interface CreateServiceInput {
  slug: string;
  name: string;
  short_description: string;
  long_description?: string;
  icon?: string;
  hero_title: string;
  hero_subtitle?: string;
  hero_image_url?: string;
  features?: ServiceFeature[];
  how_it_works?: ServiceStep[];
  use_cases?: ServiceUseCase[];
  testimonials?: ServiceTestimonial[];
  cta_title?: string;
  cta_subtitle?: string;
  cta_button_text?: string;
  cta_button_link?: string;
  meta_title?: string;
  meta_description?: string;
  is_featured?: boolean;
  is_published?: boolean;
  sort_order?: number;
}

export interface ServiceActionResult {
  success: boolean;
  serviceId?: string;
  error?: string;
}

/**
 * Create a new service (admin only)
 */
export async function createService(input: CreateServiceInput): Promise<ServiceActionResult> {
  const supabase = await createClient();
  
  // Check if user is admin
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  
  if (profile?.role !== 'admin') {
    return { success: false, error: 'Not authorized' };
  }
  
  // Create service (cast to any because services table is not in generated types yet)
  const { data, error } = await (supabase as AnySupabaseClient)
    .from('services')
    .insert({
      slug: input.slug,
      name: input.name,
      short_description: input.short_description,
      long_description: input.long_description || null,
      icon: input.icon || null,
      hero_title: input.hero_title,
      hero_subtitle: input.hero_subtitle || null,
      hero_image_url: input.hero_image_url || null,
      features: input.features || [],
      how_it_works: input.how_it_works || [],
      use_cases: input.use_cases || [],
      testimonials: input.testimonials || [],
      cta_title: input.cta_title || 'Get Started Today',
      cta_subtitle: input.cta_subtitle || 'Transform your content with AI-powered voice generation',
      cta_button_text: input.cta_button_text || 'Try It Free',
      cta_button_link: input.cta_button_link || '/auth/signup',
      meta_title: input.meta_title || null,
      meta_description: input.meta_description || null,
      is_featured: input.is_featured || false,
      is_published: input.is_published !== false,
      sort_order: input.sort_order || 0,
    })
    .select('id')
    .single();
  
  if (error) {
    console.error('Error creating service:', error);
    return { success: false, error: error.message };
  }
  
  revalidatePath('/services');
  revalidatePath('/admin/services');
  
  return { success: true, serviceId: data.id };
}

/**
 * Update a service (admin only)
 */
export async function updateService(
  serviceId: string,
  input: Partial<CreateServiceInput>
): Promise<ServiceActionResult> {
  const supabase = await createClient();
  
  // Check if user is admin
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  
  if (profile?.role !== 'admin') {
    return { success: false, error: 'Not authorized' };
  }
  
  // Update service
  const { error } = await (supabase as AnySupabaseClient)
    .from('services')
    .update(input)
    .eq('id', serviceId);
  
  if (error) {
    console.error('Error updating service:', error);
    return { success: false, error: error.message };
  }
  
  revalidatePath('/services');
  revalidatePath('/admin/services');
  
  return { success: true, serviceId };
}

/**
 * Delete a service (admin only)
 */
export async function deleteService(serviceId: string): Promise<ServiceActionResult> {
  const supabase = await createClient();
  
  // Check if user is admin
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  
  if (profile?.role !== 'admin') {
    return { success: false, error: 'Not authorized' };
  }
  
  // Delete service
  const { error } = await (supabase as AnySupabaseClient)
    .from('services')
    .delete()
    .eq('id', serviceId);
  
  if (error) {
    console.error('Error deleting service:', error);
    return { success: false, error: error.message };
  }
  
  revalidatePath('/services');
  revalidatePath('/admin/services');
  
  return { success: true };
}

/**
 * Toggle service publish status (admin only)
 */
export async function toggleServicePublished(serviceId: string): Promise<ServiceActionResult> {
  const supabase = await createClient();
  
  // Check if user is admin
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  
  if (profile?.role !== 'admin') {
    return { success: false, error: 'Not authorized' };
  }
  
  // Get current status
  const { data: service } = await (supabase as AnySupabaseClient)
    .from('services')
    .select('is_published')
    .eq('id', serviceId)
    .single();
  
  if (!service) {
    return { success: false, error: 'Service not found' };
  }
  
  // Toggle status
  const { error } = await (supabase as AnySupabaseClient)
    .from('services')
    .update({ is_published: !service.is_published })
    .eq('id', serviceId);
  
  if (error) {
    console.error('Error toggling service:', error);
    return { success: false, error: error.message };
  }
  
  revalidatePath('/services');
  revalidatePath('/admin/services');
  
  return { success: true, serviceId };
}
