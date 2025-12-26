'use client';

import { useState, useEffect, useCallback, useTransition, useRef } from 'react';
import { getPaginatedUsers, getUserDetail, type UserListItem, type PaginatedUsersResult, type UserDetailData } from '@/lib/admin/users';

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  
  return debouncedValue;
}

export function AdminUsersClient() {
  const [data, setData] = useState<PaginatedUsersResult | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [isPending, startTransition] = useTransition();
  const [selectedUser, setSelectedUser] = useState<UserDetailData | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const isFirstRender = useRef(true);
  
  const debouncedSearch = useDebounce(search, 300);
  const pageSize = 20;
  
  const fetchUsers = useCallback(async () => {
    startTransition(async () => {
      const result = await getPaginatedUsers(page, pageSize, debouncedSearch);
      setData(result);
    });
  }, [page, pageSize, debouncedSearch]);
  
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);
  
  // Reset page when search changes
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);
  
  // Scroll to top when page changes (skip initial render)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [page]);
  
  const handleUserClick = async (userId: string) => {
    setIsLoadingUser(true);
    setIsModalOpen(true);
    const userDetail = await getUserDetail(userId);
    setSelectedUser(userDetail);
    setIsLoadingUser(false);
  };
  
  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedUser(null);
  };
  
  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            placeholder="Search by email, name, or username..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-700 bg-slate-800/50 pl-10 pr-4 py-2.5 text-white placeholder-slate-400 focus:border-amber-500 focus:outline-none"
          />
        </div>
        {isPending && (
          <div className="flex items-center gap-2 text-slate-400">
            <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="text-sm">Loading...</span>
          </div>
        )}
      </div>
      
      {/* Results count */}
      {data && (
        <p className="text-sm text-slate-400">
          Showing {data.users.length} of {data.totalCount.toLocaleString()} users
          {debouncedSearch && ` matching "${debouncedSearch}"`}
        </p>
      )}
      
      {/* Users Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-800/50">
                <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Billing Provider
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Created
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {data?.users.map((user) => (
                <tr 
                  key={user.id} 
                  className="hover:bg-slate-800/30 transition-colors cursor-pointer"
                  onClick={() => handleUserClick(user.id)}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <p className="text-sm font-medium text-white">
                        {user.first_name && user.last_name 
                          ? `${user.first_name} ${user.last_name}`
                          : user.username || 'No name'}
                      </p>
                      <p className="text-sm text-slate-400">{user.email}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      user.role === 'admin' 
                        ? 'bg-red-500/20 text-red-400'
                        : user.role === 'pro'
                        ? 'bg-amber-500/20 text-amber-400'
                        : 'bg-slate-500/20 text-slate-400'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      user.billing_provider === 'stripe'
                        ? 'bg-purple-500/20 text-purple-400'
                        : user.billing_provider === 'paypal'
                          ? 'bg-blue-500/20 text-blue-400'
                          : user.billing_provider === 'paypal_legacy'
                            ? 'bg-indigo-500/20 text-indigo-300'
                            : 'bg-slate-500/20 text-slate-400'
                    }`}>
                      {user.billing_provider === 'paypal_legacy'
                        ? 'PayPal Legacy'
                        : user.billing_provider}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      user.is_legacy_user 
                        ? 'bg-purple-500/20 text-purple-400'
                        : 'bg-green-500/20 text-green-400'
                    }`}>
                      {user.is_legacy_user ? 'Legacy' : 'New'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
                    {new Date(user.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </td>
                </tr>
              ))}
              {data?.users.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                    No users found{debouncedSearch ? ` matching "${debouncedSearch}"` : ''}.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-400">
            Page {data.page} of {data.totalPages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1 || isPending}
              className="px-4 py-2 rounded-lg border border-slate-700 bg-slate-800 text-white text-sm font-medium hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            
            {/* Page numbers */}
            <div className="flex gap-1">
              {Array.from({ length: Math.min(5, data.totalPages) }, (_, i) => {
                let pageNum: number;
                if (data.totalPages <= 5) {
                  pageNum = i + 1;
                } else if (page <= 3) {
                  pageNum = i + 1;
                } else if (page >= data.totalPages - 2) {
                  pageNum = data.totalPages - 4 + i;
                } else {
                  pageNum = page - 2 + i;
                }
                
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    disabled={isPending}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      pageNum === page
                        ? 'bg-amber-500 text-white'
                        : 'border border-slate-700 bg-slate-800 text-white hover:bg-slate-700'
                    } disabled:opacity-50`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            
            <button
              onClick={() => setPage(p => Math.min(data.totalPages, p + 1))}
              disabled={page >= data.totalPages || isPending}
              className="px-4 py-2 rounded-lg border border-slate-700 bg-slate-800 text-white text-sm font-medium hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
      
      {/* User Detail Modal */}
      {isModalOpen && (
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={closeModal}
        >
          <div 
            className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {isLoadingUser ? (
              <div className="p-8 flex items-center justify-center">
                <svg className="animate-spin h-8 w-8 text-amber-500" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
            ) : selectedUser ? (
              <UserDetailContent user={selectedUser} onClose={closeModal} />
            ) : (
              <div className="p-8 text-center text-slate-400">
                User not found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function UserDetailContent({ user, onClose }: { user: UserDetailData; onClose: () => void }) {
  const charactersRemaining = user.charactersLimit !== null 
    ? Math.max(0, user.charactersLimit - user.charactersUsed) 
    : null;
  
  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-slate-700">
        <div>
          <h2 className="text-xl font-bold text-white">
            {user.first_name && user.last_name 
              ? `${user.first_name} ${user.last_name}`
              : user.username || 'No name'}
          </h2>
          <p className="text-slate-400">{user.email}</p>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-slate-800 transition-colors"
        >
          <svg className="h-6 w-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      {/* Content */}
      <div className="p-6 space-y-6">
        {/* Status Badges */}
        <div className="flex flex-wrap gap-2">
          <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
            user.role === 'admin' 
              ? 'bg-red-500/20 text-red-400'
              : user.role === 'pro'
              ? 'bg-amber-500/20 text-amber-400'
              : 'bg-slate-500/20 text-slate-400'
          }`}>
            {user.role.toUpperCase()}
          </span>
          <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
            user.is_legacy_user 
              ? 'bg-purple-500/20 text-purple-400'
              : 'bg-green-500/20 text-green-400'
          }`}>
            {user.is_legacy_user ? 'Legacy User' : 'New User'}
          </span>
          {user.subscription ? (
            <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
              user.subscription.status === 'active'
                ? 'bg-green-500/20 text-green-400'
                : 'bg-red-500/20 text-red-400'
            }`}>
              Subscription: {user.subscription.status}
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full px-3 py-1 text-sm font-medium bg-slate-500/20 text-slate-400">
              Free
            </span>
          )}
        </div>
        
        {/* Info Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <InfoCard label="Created" value={new Date(user.created_at).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          })} />
          <InfoCard label="Projects" value={user.projectsCount.toLocaleString()} />
          <InfoCard label="Audio Files" value={user.audioCount.toLocaleString()} />
          <InfoCard label="User ID" value={user.id.slice(0, 8) + '...'} small />
        </div>
        
        {/* Subscription Details */}
        <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-4">
          <h3 className="text-lg font-semibold text-white mb-3">Subscription</h3>
          {user.subscription ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-slate-400">Plan</p>
                <p className="text-white font-medium">{user.subscription.plan_name || user.subscription.plan_id || 'Unknown'}</p>
              </div>
              <div>
                <p className="text-slate-400">Provider</p>
                <p className="text-white font-medium capitalize">{user.subscription.provider}</p>
              </div>
              <div>
                <p className="text-slate-400">Type</p>
                <p className="text-white font-medium">{user.subscription.is_legacy ? 'Legacy' : 'New'}</p>
              </div>
              {user.subscription.billing_interval && (
                <div>
                  <p className="text-slate-400">Billing</p>
                  <p className="text-white font-medium capitalize">{user.subscription.billing_interval}ly</p>
                </div>
              )}
              {user.subscription.price_amount !== null && (
                <div>
                  <p className="text-slate-400">Price</p>
                  <p className="text-white font-medium">${(user.subscription.price_amount / 100).toFixed(2)}</p>
                </div>
              )}
              {user.subscription.current_period_end && (
                <div>
                  <p className="text-slate-400">Renews</p>
                  <p className="text-white font-medium">
                    {new Date(user.subscription.current_period_end).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-slate-400 text-sm">No active subscription</p>
          )}
        </div>
        
        {/* Character Usage */}
        <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-4">
          <h3 className="text-lg font-semibold text-white mb-3">Character Usage</h3>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-slate-400">Used</p>
              <p className="text-white font-medium">{user.charactersUsed.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-slate-400">Limit</p>
              <p className="text-white font-medium">
                {user.charactersLimit !== null ? user.charactersLimit.toLocaleString() : 'Unlimited'}
              </p>
            </div>
            <div>
              <p className="text-slate-400">Remaining</p>
              <p className={`font-medium ${
                charactersRemaining === null 
                  ? 'text-green-400' 
                  : charactersRemaining > 0 
                    ? 'text-white' 
                    : 'text-red-400'
              }`}>
                {charactersRemaining !== null ? charactersRemaining.toLocaleString() : 'Unlimited'}
              </p>
            </div>
          </div>
          {user.charactersLimit !== null && (
            <div className="mt-3">
              <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full ${
                    (user.charactersUsed / user.charactersLimit) > 0.9 
                      ? 'bg-red-500' 
                      : (user.charactersUsed / user.charactersLimit) > 0.7 
                        ? 'bg-amber-500' 
                        : 'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(100, (user.charactersUsed / user.charactersLimit) * 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>
        
        {/* Transactions */}
        <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-4">
          <h3 className="text-lg font-semibold text-white mb-3">
            Payment History {user.transactions.length > 0 && `(${user.transactions.length})`}
          </h3>
          {user.transactions.length > 0 ? (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {user.transactions.map((tx) => (
                <div 
                  key={tx.id} 
                  className="flex items-center justify-between p-3 rounded-lg bg-slate-900/50 border border-slate-700/50"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      tx.transaction_type === 'subscription' ? 'bg-blue-500/20' :
                      tx.transaction_type === 'one_time' ? 'bg-green-500/20' :
                      tx.transaction_type === 'renewal' ? 'bg-purple-500/20' :
                      'bg-slate-500/20'
                    }`}>
                      <svg className={`h-4 w-4 ${
                        tx.transaction_type === 'subscription' ? 'text-blue-400' :
                        tx.transaction_type === 'one_time' ? 'text-green-400' :
                        tx.transaction_type === 'renewal' ? 'text-purple-400' :
                        'text-slate-400'
                      }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">
                        {tx.item_name || tx.transaction_type}
                      </p>
                      <p className="text-xs text-slate-400">
                        {new Date(tx.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })} • {tx.gateway}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-white">
                      ${tx.amount.toFixed(2)} {tx.currency}
                    </p>
                    <span className={`text-xs font-medium ${
                      tx.redirect_status === 'success' ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {tx.redirect_status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-400 text-sm text-center py-4">No transactions found</p>
          )}
        </div>
      </div>
    </>
  );
}

function InfoCard({ label, value, small = false }: { label: string; value: string; small?: boolean }) {
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-3">
      <p className="text-xs text-slate-400 mb-1">{label}</p>
      <p className={`font-semibold text-white ${small ? 'text-xs' : 'text-lg'}`}>{value}</p>
    </div>
  );
}

