
import React from 'react';
import { BarChart3, User, LogOut, Calendar, MessageSquare, Menu, Bell, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminRole } from '@/hooks/useAdminRole';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import AdminSupportButton from '@/components/AdminSupportButton';

export const TopNavBar = () => {
  const { user, signOut, isLoading } = useAuth();
  const { isAdmin } = useAdminRole();
  const navigate = useNavigate();
  const location = useLocation();
  const onAdminRoute = location.pathname.startsWith('/admin');

  const handleSignOut = async () => {
    try {
      console.log('🔄 TopNavBar: Starting logout process...');
      await signOut();
      console.log('✅ TopNavBar: Logout completed');
      // If user signs out while on any admin route, send them back to the admin login form
      if (location.pathname.startsWith('/admin')) {
        navigate('/dashboard?redirect=/admin');
      } else {
        // For all other routes (including Community/Discussions), send to dashboard login form
        navigate('/dashboard?redirect=/dashboard');
      }
    } catch (error) {
      console.error('❌ TopNavBar: Error signing out:', error);
    }
  };

  type NavItem = { path: string; name: string; hasNotification?: boolean };
  const navigationItems: NavItem[] = [];

  const isActiveTab = (path: string) => {
    return location.pathname === path;
  };

  return (
    <div className="w-full bg-slate-700/95 backdrop-blur-lg">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Left side - Logo */}
          <div className="flex items-center gap-3">
            <Link to={onAdminRoute ? "/admin" : "/"} className="flex items-center gap-3">
              <BarChart3 className="h-8 w-8 text-cyan-400" style={{
                filter: 'drop-shadow(0 0 6px rgba(6, 182, 212, 1)) drop-shadow(0 0 12px rgba(6, 182, 212, 0.9)) drop-shadow(0 0 18px rgba(6, 182, 212, 0.8)) drop-shadow(0 0 24px rgba(6, 182, 212, 0.7)) drop-shadow(0 0 30px rgba(6, 182, 212, 0.6)) drop-shadow(0 0 36px rgba(6, 182, 212, 0.5))'
              }} />
              <span
                className="hidden sm:inline-block text-2xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-cyan-300 to-purple-400 tracking-tight"
                style={{ filter: 'drop-shadow(0 0 8px rgba(6, 182, 212, 0.35))' }}
              >
                Rentalizer
              </span>
            </Link>
          </div>

          {/* Center - Navigation (only show for logged-in users) */}
          {user && (
            <div className="hidden md:flex items-center space-x-8">
              {navigationItems.map((item) => {
                const isActive = isActiveTab(item.path);
                
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`relative flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      isActive
                        ? 'text-cyan-400 border-b-2 border-cyan-400'
                        : 'text-gray-300 hover:text-cyan-400'
                    }`}
                  >
                    {item.name}
                    {item.hasNotification && (
                      <Badge className="ml-1 bg-red-500 text-white text-xs px-1 py-0 min-w-[16px] h-4 rounded-full">
                        1
                      </Badge>
                    )}
                  </Link>
                );
              })}
            </div>
          )}

          {/* Right side - Menu and User */}
          <div className="flex items-center space-x-4">
            {user && (
              onAdminRoute ? (
                // Admin route: only show Sign Out
                <div className="flex items-center">
                  <Button
                    onClick={handleSignOut}
                    variant="outline"
                    size="sm"
                    className="border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/10 flex items-center gap-2"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </Button>
                </div>
              ) : (
                // Non-admin route: full user controls
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-cyan-400" />
                    <div className="relative z-50">
                      <Link 
                        to="/profile-setup" 
                        className="text-cyan-300 hover:text-cyan-200 transition-colors cursor-pointer underline-offset-4 hover:underline font-medium block py-1 px-1"
                      >
                        My Profile
                      </Link>
                    </div>
                    {isAdmin && (
                      <div className="relative z-50">
                        <Link
                          to="/admin"
                          className="flex items-center gap-1 text-cyan-300 hover:text-cyan-200 transition-colors cursor-pointer underline-offset-4 hover:underline font-medium py-1 px-1"
                          title="Admin Console"
                        >
                          <Shield className="h-4 w-4" />
                          Admin
                        </Link>
                      </div>
                    )}
                    <Badge variant="outline" className="bg-blue-900/30 border-blue-500/30 text-blue-300 text-xs px-2 py-0 ml-2">
                      Pro
                    </Badge>
                  </div>
                  <Button
                    onClick={handleSignOut}
                    variant="outline"
                    size="sm"
                    className="border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/10 flex items-center gap-2"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </Button>
                </div>
              )
            )}
            {!user && null}
          </div>
        </div>
      </div>
    </div>
  );
};
