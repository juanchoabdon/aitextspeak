'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toggleServicePublished, deleteService } from '@/lib/services/actions';
import type { Service } from '@/lib/services/db';

interface AdminServicesListProps {
  services: Service[];
}

export function AdminServicesList({ services }: AdminServicesListProps) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleTogglePublish = async (serviceId: string) => {
    setLoadingId(serviceId);
    try {
      const result = await toggleServicePublished(serviceId);
      if (!result.success) {
        alert(result.error || 'Failed to toggle service');
      }
      router.refresh();
    } catch (error) {
      console.error('Error toggling service:', error);
      alert('Failed to toggle service');
    } finally {
      setLoadingId(null);
    }
  };

  const handleDelete = async (serviceId: string, serviceName: string) => {
    if (!confirm(`Are you sure you want to delete "${serviceName}"? This cannot be undone.`)) {
      return;
    }

    setLoadingId(serviceId);
    try {
      const result = await deleteService(serviceId);
      if (!result.success) {
        alert(result.error || 'Failed to delete service');
      }
      router.refresh();
    } catch (error) {
      console.error('Error deleting service:', error);
      alert('Failed to delete service');
    } finally {
      setLoadingId(null);
    }
  };

  if (services.length === 0) {
    return (
      <div className="text-center py-16 rounded-2xl border border-slate-800 bg-slate-900/50">
        <div className="text-5xl mb-4">🎯</div>
        <h3 className="text-lg font-medium text-white mb-2">No services yet</h3>
        <p className="text-slate-400 mb-6">Create your first service landing page</p>
        <Link
          href="/admin/services/new"
          className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 px-4 py-2 text-sm font-medium text-white hover:from-amber-400 hover:to-orange-500 transition-colors cursor-pointer"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Service
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/50 overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-800 bg-slate-900/50">
            <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Service</th>
            <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Slug</th>
            <th className="px-6 py-4 text-center text-sm font-semibold text-slate-300">Featured</th>
            <th className="px-6 py-4 text-center text-sm font-semibold text-slate-300">Status</th>
            <th className="px-6 py-4 text-right text-sm font-semibold text-slate-300">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800">
          {services.map((service) => (
            <tr key={service.id} className="hover:bg-slate-800/30 transition-colors">
              <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{service.icon || '🎯'}</span>
                  <div>
                    <div className="font-medium text-white">{service.name}</div>
                    <div className="text-sm text-slate-400 line-clamp-1 max-w-xs">
                      {service.short_description}
                    </div>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4">
                <code className="text-sm text-amber-400 bg-slate-800 px-2 py-1 rounded">
                  /services/{service.slug}
                </code>
              </td>
              <td className="px-6 py-4 text-center">
                {service.is_featured ? (
                  <span className="inline-flex items-center rounded-full bg-amber-500/20 px-2 py-1 text-xs font-medium text-amber-400">
                    ⭐ Featured
                  </span>
                ) : (
                  <span className="text-slate-500">—</span>
                )}
              </td>
              <td className="px-6 py-4 text-center">
                <button
                  onClick={() => handleTogglePublish(service.id)}
                  disabled={loadingId === service.id}
                  className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    service.is_published
                      ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                      : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                  }`}
                >
                  {loadingId === service.id ? (
                    <svg className="animate-spin h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : null}
                  {service.is_published ? 'Published' : 'Draft'}
                </button>
              </td>
              <td className="px-6 py-4">
                <div className="flex items-center justify-end gap-2">
                  <Link
                    href={`/services/${service.slug}`}
                    target="_blank"
                    className="p-2 text-slate-400 hover:text-white transition-colors cursor-pointer"
                    title="View"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </Link>
                  <Link
                    href={`/admin/services/${service.id}`}
                    className="p-2 text-slate-400 hover:text-amber-400 transition-colors cursor-pointer"
                    title="Edit"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </Link>
                  <button
                    onClick={() => handleDelete(service.id, service.name)}
                    disabled={loadingId === service.id}
                    className="p-2 text-slate-400 hover:text-red-400 transition-colors disabled:opacity-50"
                    title="Delete"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
