import React from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield } from 'lucide-react';
import { TopNavBar } from '@/components/TopNavBar';
import { Footer } from '@/components/Footer';
import { useAdminRole } from '@/hooks/useAdminRole';

const AdminHub: React.FC = () => {
  const { isAdmin, loading } = useAdminRole();
  const navigate = useNavigate();
  const location = useLocation();

  const isDevBypass = (
    (typeof import.meta !== 'undefined' && typeof import.meta.env !== 'undefined' && import.meta.env.DEV === true) ||
    (typeof window !== 'undefined' && (
      window.location.hostname.includes('localhost') ||
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname === '0.0.0.0' ||
      window.location.search.includes('dev=1') ||
      window.location.search.includes('__lovable_token')
    ))
  );

  const current = location.pathname.endsWith('/admin')
    ? 'members'
    : location.pathname.includes('/admin/discussions')
      ? 'discussions'
      : location.pathname.includes('/admin/richie')
        ? 'richie'
        : 'members';

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto"></div>
          <p className="text-gray-300">Checking admin permissions…</p>
        </div>
      </div>
    );
  }

  if (!isAdmin && !isDevBypass) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <Card className="max-w-md w-full bg-slate-800/50 border-red-500/30">
          <CardHeader className="text-center">
            <Shield className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <CardTitle className="text-xl text-red-300">Access Denied</CardTitle>
          </CardHeader>
          <CardContent className="text-center text-gray-300">
            Only administrators can access the admin console.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col">
      <TopNavBar />

      <div className="flex-1 container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white">Admin Console</h1>
          <p className="text-gray-400">Manage members, discussions, and Richie tools</p>
        </div>

        <Tabs value={current} onValueChange={(v) => navigate(`/admin/${v}`)}>
          <TabsList className="bg-slate-800/50 border border-cyan-500/20">
            <TabsTrigger value="members" className="text-gray-200 data-[state=active]:text-cyan-300">Members</TabsTrigger>
            <TabsTrigger value="discussions" className="text-gray-200 data-[state=active]:text-cyan-300">Discussions</TabsTrigger>
            <TabsTrigger value="richie" className="text-gray-200 data-[state=active]:text-cyan-300">Richie</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="mt-6">
          <Outlet />
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default AdminHub;
