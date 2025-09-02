import React from 'react';
import { BarChart3, User, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';

export const TopNavBarTest = () => {
  const { user, signOut } = useAuth();
  
  // Only show user info if it's a real authenticated user (not development mock)
  // Hide development mock user completely
  const showUserInfo = user && user.email !== 'dev@example.com';

  return (
    <div className="w-full bg-slate-700/95 backdrop-blur-lg">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Left side - Logo only */}
          <div className="flex items-center gap-3 ml-48">
            <BarChart3 className="h-8 w-8 text-cyan-400" style={{
              filter: 'drop-shadow(0 0 6px rgba(6, 182, 212, 1)) drop-shadow(0 0 12px rgba(6, 182, 212, 0.9)) drop-shadow(0 0 18px rgba(6, 182, 212, 0.8)) drop-shadow(0 0 24px rgba(6, 182, 212, 0.7)) drop-shadow(0 0 30px rgba(6, 182, 212, 0.6)) drop-shadow(0 0 36px rgba(6, 182, 212, 0.5))'
            }} />
          </div>

          {/* Right side - Login or User info */}
          {showUserInfo ? (
            <div className="flex items-center gap-4 mr-48">
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-cyan-400" />
                <span className="text-cyan-300">{user.email}</span>
                <Badge variant="outline" className="bg-blue-900/30 border-blue-500/30 text-blue-300 text-xs px-2 py-0 ml-2">
                  Pro
                </Badge>
              </div>
              <Button
                onClick={signOut}
                variant="outline"
                size="sm"
                className="border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/10 flex items-center gap-2"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/10 font-medium mr-48"
            >
              Login
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};