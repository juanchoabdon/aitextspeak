import { createAdminClient } from '@/lib/supabase/server';

interface UserProfile {
  id: string;
  email: string;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  role: string;
  is_legacy_user: boolean;
  created_at: string;
  billing_provider?: 'stripe' | 'paypal' | 'paypal_legacy' | 'free';
}

async function getUsers(): Promise<UserProfile[]> {
  const supabase = createAdminClient();
  
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, username, first_name, last_name, role, is_legacy_user, created_at')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('Error fetching users:', error);
    return [];
  }

  const users = (data || []) as UserProfile[];
  const userIds = users.map(u => u.id);

  // Fetch subscriptions for these users and derive a "billing provider" label.
  // Prefer an active subscription; otherwise fall back to the most recent subscription.
  if (userIds.length > 0) {
    const { data: subs } = await supabase
      .from('subscriptions')
      .select('user_id, provider, status, created_at')
      .in('user_id', userIds)
      .order('created_at', { ascending: false });

    const activeProviderByUser = new Map<string, UserProfile['billing_provider']>();
    const recentProviderByUser = new Map<string, UserProfile['billing_provider']>();

    for (const sub of subs || []) {
      const provider = (sub.provider as UserProfile['billing_provider']) || undefined;
      const status = (sub.status as string | null) || null;
      if (!provider) continue;

      // First seen is most recent due to order() above
      if (!recentProviderByUser.has(sub.user_id)) {
        recentProviderByUser.set(sub.user_id, provider);
      }
      if (status === 'active' && !activeProviderByUser.has(sub.user_id)) {
        activeProviderByUser.set(sub.user_id, provider);
      }
    }

    for (const u of users) {
      u.billing_provider = activeProviderByUser.get(u.id) || recentProviderByUser.get(u.id) || 'free';
    }
  }

  return users;
}

export async function AdminUsersList() {
  const users = await getUsers();

  if (users.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-8 text-center">
        <p className="text-slate-400">No users found.</p>
      </div>
    );
  }

  return (
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
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-slate-800/30 transition-colors">
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
                      ? 'paypal legacy'
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
          </tbody>
        </table>
      </div>
    </div>
  );
}









