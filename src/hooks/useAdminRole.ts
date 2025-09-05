import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useLocation } from 'react-router-dom';

export const useAdminRole = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdminRole = async () => {
      if (!user) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      // TEMPORARY: Preview override to see admin UI without DB role
      // Activate by visiting any route with ?previewAdmin=1 on local/network hosts
      // Example: http://192.168.1.69:8080/admin/members?previewAdmin=1
      try {
        const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
        const isLocalHost =
          hostname === 'localhost' ||
          hostname === '127.0.0.1' ||
          hostname.startsWith('192.168.');
        const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : undefined;
        const previewFlag = params?.get('previewAdmin') === '1';

        if (isLocalHost && previewFlag) {
          setIsAdmin(true);
          setLoading(false);
          return;
        }
      } catch (_) {
        // ignore preview detection errors
      }

      // Check actual admin role in database
      try {
        // First attempt: filter by role at the DB
        let isAdminDetected = false;
        try {
          const { data: roleData, error } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', user.id)
            .eq('role', 'admin')
            .maybeSingle();
          if (!error && roleData) {
            isAdminDetected = true;
          }
        } catch (e) {
          // fall through to retry without role filter
          console.warn('useAdminRole: first role check failed, retrying without role filter', e);
        }

        if (!isAdminDetected) {
          // Retry: fetch roles for the user (avoids potential policy recursion issues)
          const { data: roles, error: rolesErr } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', user.id);
          if (!rolesErr && Array.isArray(roles)) {
            isAdminDetected = roles.some((r: { role: string }) => (r.role || '').toLowerCase() === 'admin');
          }
        }

        setIsAdmin(isAdminDetected);
      } catch (error) {
        console.error('useAdminRole: role check error', error);
        setIsAdmin(false);
      }
      
      setLoading(false);
    };

    checkAdminRole();
  }, [user, location.search]);

  return { isAdmin, loading };
};