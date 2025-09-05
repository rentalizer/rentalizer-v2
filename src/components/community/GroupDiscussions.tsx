import React, { useState, useEffect, useCallback, useMemo } from 'react';

// Extend Window interface for Calendly
declare global {
  interface Window {
    Calendly?: unknown;
  }
}
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Users, MessageCircle, Heart, Pin, TrendingUp, Calendar, Edit, Trash2, Send, MoreHorizontal, BarChart3 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';
import { ProfileSetup } from '@/components/ProfileSetup';
import { useAdminRole } from '@/hooks/useAdminRole';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { NewsFeed } from '@/components/community/NewsFeed';
import { MembersList } from '@/components/MembersList';
import { CommunityHeader } from '@/components/community/CommunityHeader';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useMemberCount } from '@/hooks/useMemberCount';
import { useOnlineUsers } from '@/hooks/useOnlineUsers';

interface Discussion {
  id: string;
  title: string;
  content: string;
  author: string;
  avatar: string;
  category: string;
  likes: number;
  comments: number;
  timeAgo: string;
  created_at: string;
  isPinned?: boolean;
  isLiked?: boolean;
  user_id?: string;
  isMockData?: boolean;
  isSkoolHighlight?: boolean;
}

interface UserProfile {
  user_id: string;
  avatar_url: string | null;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
}

export const GroupDiscussions = ({ isDayMode = false, disablePosting = false, forceTagLabel, authorFilter, titleLinkOverrides, skoolLinkOverrides, allowAdminPinAll = false, adminCanPin = false, pinScope = 'global', adminContext = false }: { isDayMode?: boolean; disablePosting?: boolean; forceTagLabel?: string; authorFilter?: string; titleLinkOverrides?: Record<string, string>; skoolLinkOverrides?: Record<string, string>; allowAdminPinAll?: boolean; adminCanPin?: boolean; pinScope?: 'global' | 'author'; adminContext?: boolean }) => {
  const { user, profile } = useAuth();
  const { isAdmin } = useAdminRole();
  const { toast } = useToast();
  
  const [discussionsList, setDiscussionsList] = useState<Discussion[]>([]);
  const [selectedDiscussion, setSelectedDiscussion] = useState<Discussion | null>(null);
  const [newComment, setNewComment] = useState('');
  const [comments, setComments] = useState<{[key: string]: {id: string; author: string; avatar: string; content: string; timeAgo: string;}[]}>({});
  const [editingPost, setEditingPost] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [showProfileSetup, setShowProfileSetup] = useState(false);
  const [expandedPost, setExpandedPost] = useState<string | null>(null);
  const [userProfiles, setUserProfiles] = useState<{[key: string]: UserProfile}>({});
  const { memberCount, loading: memberCountLoading } = useMemberCount();
  const { onlineCount, adminNames, loading: onlineLoading } = useOnlineUsers();
  const [showMembersList, setShowMembersList] = useState(false);

  // Check if user needs to set up profile
  useEffect(() => {
    if (user && profile && (!profile.display_name || profile.display_name.trim() === '')) {
      setShowProfileSetup(true);
    }
  }, [user, profile]);

  // Memoized helper functions to prevent re-renders
  const getInitials = useCallback((name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }, []);

  const getUserAvatar = useCallback(() => {
    return profile?.avatar_url || null;
  }, [profile?.avatar_url]);

  const getUserName = useCallback(() => {
    const name = profile?.display_name || user?.email?.split('@')[0] || 'Anonymous User';
    return isAdmin ? `${name} (Admin)` : name;
  }, [profile?.display_name, user?.email, isAdmin]);

  const getUserInitials = useCallback(() => {
    const name = profile?.display_name || user?.email?.split('@')[0] || 'Anonymous User';
    return getInitials(name);
  }, [profile?.display_name, user?.email, getInitials]);

  // Check if a discussion is from an admin
  const isAdminPost = useCallback((discussion: Discussion) => {
    // Check if the author name contains "(Admin)" or if the user_id matches current admin user
    return discussion.author.includes('(Admin)') || 
           (user && discussion.user_id === user.id && isAdmin);
  }, [user, isAdmin]);

  // Fetch user profiles
  const fetchUserProfiles = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, avatar_url, display_name, first_name, last_name');

      if (error) {
        console.error('Error fetching profiles:', error);
        return;
      }

      const profilesMap: {[key: string]: UserProfile} = {};
      data?.forEach(profile => {
        profilesMap[profile.user_id] = profile;
      });
      
      setUserProfiles(profilesMap);
    } catch (error) {
      console.error('Exception fetching user profiles:', error);
    }
  }, []);

  const formatTimeAgo = useCallback((dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  }, []);

  // Fetch discussions from database with proper sorting
  const fetchDiscussions = useCallback(async () => {
    console.log('🔄 Fetching discussions from database...');
    
    try {
      const { data, error } = await supabase
        .from('discussions')
        .select('*')
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching discussions:', error);
        return;
      }
      
      console.log('📥 Raw data from database:', data?.length || 0, 'discussions');
      
      // Convert database format to component format
      const formattedDiscussions = (data || []).map(discussion => ({
        id: discussion.id,
        title: discussion.title,
        content: discussion.content,
        author: discussion.author_name,
        avatar: getInitials(discussion.author_name),
        category: discussion.category,
        likes: discussion.likes_count || 0,
        comments: discussion.comments_count || 0,
        timeAgo: formatTimeAgo(discussion.created_at),
        created_at: discussion.created_at,
        user_id: discussion.user_id,
        isPinned: discussion.is_pinned || false,
        isLiked: false,
        isMockData: false,
        isSkoolHighlight: typeof discussion.content === 'string' && discussion.content.startsWith('🟦 Skool Highlight')
      }));

      console.log('✅ Formatted discussions:', formattedDiscussions.length);
      console.log('📌 Pinned discussions:', formattedDiscussions.filter(d => d.isPinned).length);
      setDiscussionsList(formattedDiscussions);
    } catch (error) {
      console.error('❌ Exception fetching discussions:', error);
    }
  }, [getInitials, formatTimeAgo]);

  // formatTimeAgo is defined above fetchDiscussions

  // Initialize data - ONLY fetch once on mount
  useEffect(() => {
    fetchUserProfiles();
    fetchDiscussions();
  }, [fetchUserProfiles, fetchDiscussions]);

  // Fixed profile info function - this was the source of the bug
  const getProfileInfo = useCallback((userId: string | undefined, authorName: string) => {
    console.log('🔍 Getting profile info for:', { userId, authorName, currentUserId: user?.id });
    
    // For posts without a user_id, use the author name and generate initials
    if (!userId) {
      return {
        avatar_url: null,
        display_name: authorName,
        initials: getInitials(authorName)
      };
    }

    // For the current user's posts, use their current profile from the auth context
    if (user && user.id === userId) {
      const currentDisplayName = profile?.display_name || user.email?.split('@')[0] || authorName;
      const finalDisplayName = isAdmin ? `${currentDisplayName} (Admin)` : currentDisplayName;
      
      console.log('✅ Using current user profile:', { 
        displayName: finalDisplayName, 
        avatarUrl: profile?.avatar_url 
      });
      
      return {
        avatar_url: profile?.avatar_url,
        display_name: finalDisplayName,
        initials: getInitials(currentDisplayName)
      };
    }

    // For other users, get their profile from the profiles map
    const userProfile = userProfiles[userId];
    if (userProfile) {
      const displayName = userProfile.display_name || userProfile.first_name || authorName;
      return {
        avatar_url: userProfile.avatar_url,
        display_name: displayName,
        initials: getInitials(displayName)
      };
    }
    
    // Fallback to author name and initials
    return {
      avatar_url: null,
      display_name: authorName,
      initials: getInitials(authorName)
    };
  }, [user, profile, isAdmin, userProfiles, getInitials]);

  // Since we're already sorting in the database query, we don't need complex sorting here
  const filteredDiscussions = useMemo(() => {
    console.log('🔍 Filtering discussions. Total discussions:', discussionsList.length);
    const pinnedCount = discussionsList.filter(d => d.isPinned).length;
    console.log('📌 Pinned posts:', pinnedCount, 'Regular posts:', discussionsList.length - pinnedCount);
    console.log('📌 First 3 posts order:', discussionsList.slice(0, 3).map(d => ({ title: d.title.substring(0, 30), isPinned: d.isPinned })));

    // Base list is already sorted from the database
    let list = discussionsList;

    // Apply author filter if provided (case-insensitive)
    const query = (authorFilter || '').trim().toLowerCase();
    if (query) {
      list = list.filter(d => {
        const authorRaw = (d.author || '').toLowerCase();
        // Consider linked profile display name if available
        const prof = d.user_id ? userProfiles[d.user_id] : undefined;
        const display = (prof?.display_name || '').toLowerCase();
        return authorRaw.includes(query) || display.includes(query);
      });
    }

    // Apply pin scope ordering for non-admin user views if needed
    if (pinScope === 'author' && user && !isAdmin) {
      const score = (d: Discussion) => (d.isPinned && d.user_id === user.id ? 1 : 0);
      list = [...list].sort((a, b) => {
        const s = score(b) - score(a);
        if (s !== 0) return s;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
    }

    return list;
  }, [discussionsList, authorFilter, userProfiles, pinScope, user, isAdmin]);

  // Control visibility of the pinned icon/badge based on pinScope
  const isPinnedVisible = useCallback((d: Discussion) => {
    if (pinScope === 'author' && user && !isAdmin) {
      return !!d.isPinned && d.user_id === user.id;
    }
    return !!d.isPinned;
  }, [pinScope, user, isAdmin]);

  const handleLike = useCallback((discussionId: string) => {
    setDiscussionsList(prev => prev.map(discussion => 
      discussion.id === discussionId
        ? { 
            ...discussion, 
            isLiked: !discussion.isLiked,
            likes: discussion.isLiked ? discussion.likes - 1 : discussion.likes + 1
          }
        : discussion
    ));
  }, []);

  const handleAddComment = useCallback(async () => {
    if (!newComment.trim() || !selectedDiscussion) return;

    const comment = {
      id: String(Date.now()),
      author: getUserName(),
      avatar: getUserInitials(),
      content: newComment,
      timeAgo: 'now'
    };
    
    setComments(prev => ({
      ...prev,
      [selectedDiscussion.id]: [...(prev[selectedDiscussion.id] || []), comment]
    }));
    
    setDiscussionsList(prev => prev.map(d => 
      d.id === selectedDiscussion.id 
        ? { ...d, comments: d.comments + 1 }
        : d
    ));
    
    setNewComment('');
  }, [newComment, selectedDiscussion, getUserName, getUserInitials]);

  const handlePinToggle = useCallback(async (discussionId: string) => {
    if (!(isAdmin || adminCanPin)) {
      return;
    }

    const discussion = discussionsList.find(d => d.id === discussionId);
    if (!discussion) {
      return;
    }

    try {
      const newPinnedStatus = !discussion.isPinned;

      // Optimistic UI update so the badge/icon turns yellow immediately and item moves to top
      const sorter = (a: Discussion, b: Discussion) => {
        // In author scope for non-admins, only prioritize the current user's pinned posts
        if (pinScope === 'author' && user && !isAdmin) {
          const aScore = a.isPinned && a.user_id === user.id ? 1 : 0;
          const bScore = b.isPinned && b.user_id === user.id ? 1 : 0;
          const delta = bScore - aScore;
          if (delta !== 0) return delta;
        } else {
          const pinDelta = (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0);
          if (pinDelta !== 0) return pinDelta;
        }
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      };
      const prevState = discussionsList;
      setDiscussionsList(prev => {
        const updated = prev.map(d => d.id === discussionId ? { ...d, isPinned: newPinnedStatus } : d);
        return [...updated].sort(sorter);
      });

      // Update database first
      const { data: updatedRows, error } = await supabase
        .from('discussions')
        .update({ is_pinned: newPinnedStatus })
        .eq('id', discussionId)
        .select('id, is_pinned');

      if (error) {
        console.error('❌ Error updating pin status:', error);
        // Rollback optimistic update on error
        setDiscussionsList(prevState);
        toast({
          title: "Error",
          description: "Failed to update pin status",
          variant: "destructive"
        });
        return;
      }

      if (!updatedRows || updatedRows.length === 0) {
        console.warn('⚠️ No rows updated when toggling pin — possible RLS/permissions issue');
        setDiscussionsList(prevState);
        toast({
          title: "Pin Not Saved",
          description: "Your account may not have permission to pin this post.",
          variant: "destructive"
        });
        return;
      }

      // Keep optimistic state; no immediate refetch to avoid flashing/reverting UI

      toast({
        title: newPinnedStatus ? "Post Pinned" : "Post Unpinned",
        description: newPinnedStatus 
          ? "This post will now appear at the top of the discussions" 
          : "This post will no longer be pinned",
      });

      console.log('✅ Pin status updated successfully');
    } catch (error) {
      console.error('❌ Exception updating pin status:', error);
      toast({
        title: "Error",
        description: "There was an error updating the pin status",
        variant: "destructive"
      });
    }
  }, [isAdmin, adminCanPin, discussionsList, toast, pinScope, user]);

  const handleDeleteDiscussion = useCallback(async (discussionId: string) => {
    try {
      // First delete from database to ensure admin permissions work
      const { data, error } = await supabase
        .from('discussions')
        .delete()
        .eq('id', discussionId)
        .select();
        
      console.log('🗑️ Delete response data:', data);
      console.log('🗑️ Delete response error:', error);
        
      if (error) {
        console.error('❌ Database deletion failed:', error);
        console.error('❌ Error details:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        toast({
          title: "Error",
          description: `Failed to delete discussion: ${error.message}`,
          variant: "destructive"
        });
        return;
      }

      if (!data || data.length === 0) {
        console.warn('⚠️ No rows were deleted - discussion may not exist or permission denied');
        toast({
          title: "Warning", 
          description: "No discussion was deleted. It may not exist or you may not have permission.",
          variant: "destructive"
        });
        return;
      }

      console.log('✅ Database deletion successful - deleted rows:', data.length);

      // After successful database deletion, update UI
      setDiscussionsList(prevDiscussions => {
        const newDiscussions = prevDiscussions.filter(d => d.id !== discussionId);
        console.log('🗑️ UI updated - discussions count:', newDiscussions.length);
        return newDiscussions;
      });

      toast({
        title: "Discussion Deleted",
        description: "Discussion has been permanently removed.",
      });

    } catch (error) {
      console.error('❌ Exception during deletion:', error);
      toast({
        title: "Error",
        description: "There was an error deleting the discussion.",
        variant: "destructive"
      });
    }
  }, [toast]);

  // Save edit to database and update UI
  const handleSaveEdit = useCallback(async (discussionId: string) => {
    if (!editingPost) return;
    if (!editTitle.trim()) {
      toast({ title: 'Title required', description: 'Please enter a title.', variant: 'destructive' });
      return;
    }
    try {
      setIsSavingEdit(true);
      const { data, error } = await supabase
        .from('discussions')
        .update({ content: editContent, title: editTitle })
        .eq('id', discussionId)
        .select('id, content, title')
        .single();

      if (error) {
        console.error('❌ Error updating discussion:', error);
        toast({ title: 'Error', description: 'Failed to save changes.', variant: 'destructive' });
        setIsSavingEdit(false);
        return;
      }

      // Update UI state
      setDiscussionsList(prev => prev.map(d => d.id === discussionId ? { ...d, content: data?.content ?? editContent, title: data?.title ?? editTitle } : d));
      setEditingPost(null);
      setEditContent('');
      setEditTitle('');
      setIsSavingEdit(false);
      toast({ title: 'Saved', description: 'Your post has been updated.' });
    } catch (e) {
      console.error('❌ Exception updating discussion:', e);
      setIsSavingEdit(false);
      toast({ title: 'Error', description: 'There was an error saving your changes.', variant: 'destructive' });
    }
  }, [editingPost, editContent, editTitle, toast]);

  const handleCancelEdit = useCallback(() => {
    setEditingPost(null);
    setEditContent('');
    setEditTitle('');
  }, []);

  // Admin-only: delete all posts by a specific member (used in AdminDiscussions member view)
  const handleDeleteAllByMember = useCallback(async (userId: string | undefined, authorName: string) => {
    // allow in adminContext (Admin UI) or when actual admin
    if (!(adminContext || isAdmin)) return;
    if (!authorFilter) return; // only allow in filtered member view

    const confirmMsg = `Delete ALL posts by ${authorName}? This cannot be undone.`;
    const ok = typeof window !== 'undefined' ? window.confirm(confirmMsg) : true;
    if (!ok) return;

    try {
      // Delete on server first
      let query = supabase.from('discussions').delete();
      if (userId) {
        query = query.eq('user_id', userId);
      } else {
        query = query.eq('author_name', authorFilter);
      }
      const { data, error } = await query.select('id, user_id, author_name');

      if (error) {
        console.error('❌ Failed to delete all posts by member:', error);
        toast({ title: 'Error', description: 'Failed to delete all posts by this member.', variant: 'destructive' });
        return;
      }

      // Update UI
      setDiscussionsList(prev => prev.filter(d => {
        if (userId) return d.user_id !== userId;
        // fallback by author name
        return (d.author || '').trim() !== (authorFilter || '').trim();
      }));

      const deletedCount = data?.length ?? 0;
      toast({ title: 'Deleted', description: `Removed ${deletedCount} post${deletedCount === 1 ? '' : 's'} by ${authorName}.` });
    } catch (err) {
      console.error('❌ Exception deleting all posts by member:', err);
      toast({ title: 'Error', description: 'There was an error deleting posts.', variant: 'destructive' });
    }
  }, [isAdmin, adminContext, authorFilter, toast]);

  const canEditOrDelete = useCallback((discussion: Discussion) => {
    // Admins can manage any post, even on regular discussion page
    if (isAdmin || adminContext) return true;
    // Users can manage their own posts
    if (user && discussion.user_id === user.id) return true;
    return false;
  }, [isAdmin, adminContext, user]);

  const canPin = useCallback((discussion: Discussion) => {
    // Allow admins to pin any post anywhere
    if (!(isAdmin || adminCanPin)) return false;
    if (isAdmin) return true;
    // For non-admin elevated contexts, respect flag or author-only rule
    return allowAdminPinAll ? true : isAdminPost(discussion);
  }, [isAdmin, isAdminPost, allowAdminPinAll, adminCanPin]);

  const getTruncatedContent = useCallback((content: string, maxLength: number = 150) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  }, []);

  // Handle post creation callback - refresh discussions list
  const handlePostCreated = useCallback(() => {
    console.log('🔄 New post created - refreshing discussions list');
    fetchDiscussions();
  }, [fetchDiscussions]);

  // Debug render
  console.log('🎨 RENDERING GroupDiscussions with', filteredDiscussions.length, 'discussions');

  return (
    <div className="flex gap-6">
      {/* Main Content */}
      <div className="flex-1">
        <div className="max-w-4xl space-y-6">
          {/* Profile Setup Modal */}
          {showProfileSetup && (
            <Dialog open={showProfileSetup} onOpenChange={setShowProfileSetup}>
              <DialogContent className="bg-slate-900/95 border-gray-700 max-w-md">
                <ProfileSetup onComplete={() => setShowProfileSetup(false)} />
              </DialogContent>
            </Dialog>
          )}
          
          {/* Header with Post Input */}
          {disablePosting ? null : (
            <CommunityHeader onPostCreated={handlePostCreated} isDayMode={isDayMode} />
          )}


          {/* Discussion Posts */}
          <div className="space-y-4">
            {filteredDiscussions.length === 0 ? (
              <Card className="bg-slate-800/50 border-gray-700/50">
                <CardContent className="p-6 text-center text-gray-400">
                  No member post
                </CardContent>
              </Card>
            ) : (
            filteredDiscussions.map((discussion) => {
              const profileInfo = getProfileInfo(discussion.user_id, discussion.author);
              
              return (
                <Card key={discussion.id} className="bg-slate-800/50 border-gray-700/50 hover:bg-slate-800/70 transition-colors">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      {/* User Avatar */}
                      <Avatar className="w-12 h-12 flex-shrink-0">
                        {profileInfo.avatar_url ? (
                          <AvatarImage 
                            src={profileInfo.avatar_url} 
                            alt={`${discussion.author}'s avatar`}
                            className="object-cover w-full h-full"
                          />
                        ) : null}
                        <AvatarFallback className="bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-bold">
                          {profileInfo.initials}
                        </AvatarFallback>
                      </Avatar>

                      {/* Post Content */}
                      <div className="flex-1 min-w-0">
                        {/* Header */}
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {isPinnedVisible(discussion) && <Pin className="h-4 w-4 text-yellow-400" />}
                            <span className="text-cyan-300 font-medium">{profileInfo.display_name}</span>
                            <span className="text-gray-400">•</span>
                            <span className="text-gray-400 text-sm">{discussion.timeAgo}</span>
                            <span className="text-gray-400">•</span>
                            <span className="text-gray-400 text-sm">{discussion.category}</span>
                            {isPinnedVisible(discussion) && (
                              <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30 text-xs ml-2">
                                Pinned
                              </Badge>
                            )}
                            {discussion.isSkoolHighlight && (
                              (() => {
                                const skoolHref = skoolLinkOverrides?.[discussion.title] || 'https://www.skool.com/creativeairbnb/welcome-aboard';
                                return (
                                  <a
                                    href={skoolHref}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    title="Open Skool"
                                  >
                                    <Badge className="bg-cyan-600/20 text-cyan-300 border-cyan-500/30 text-xs ml-2 hover:bg-cyan-600/30">
                                      Skool
                                    </Badge>
                                  </a>
                                );
                              })()
                            )}
                            {forceTagLabel && (
                              (() => {
                                const href = skoolLinkOverrides?.[discussion.title];
                                const badge = (
                                  <Badge className="bg-cyan-600/20 text-cyan-300 border-cyan-500/30 text-xs ml-2">
                                    {forceTagLabel}
                                  </Badge>
                                );
                                return href ? (
                                  <a href={href} target="_blank" rel="noopener noreferrer" title="Open Skool">
                                    {badge}
                                  </a>
                                ) : badge;
                              })()
                            )}
                          </div>
                          
                          {/* Pin Icon and Options Menu */}
                          <div className="flex items-center gap-2">
                            {/* Pin Icon for Admin Posts Only */}
                            {canPin(discussion) && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handlePinToggle(discussion.id)}
                                className={`h-8 w-8 p-0 transition-colors ${
                                  discussion.isPinned 
                                    ? 'text-yellow-400 hover:text-yellow-300' 
                                    : 'text-gray-400 hover:text-yellow-400'
                                }`}
                                title={discussion.isPinned ? 'Unpin post' : 'Pin post'}
                              >
                                <Pin className="h-4 w-4" />
                              </Button>
                            )}
                            
                            {/* Options Menu */}
                            {(adminContext || isAdmin || (user && discussion.user_id === user.id)) && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-400 hover:text-white">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="bg-slate-800 border-gray-700">
                                  {/* Edit: only show in user discussion (owner) and NOT in admin view */}
                                  {(!adminContext && user && discussion.user_id === user.id) && (
                                    <DropdownMenuItem 
                                      onClick={() => {
                                        setEditingPost(discussion.id);
                                        setEditContent(discussion.content);
                                        setEditTitle(discussion.title);
                                      }}
                                      className="text-gray-300 hover:text-white hover:bg-slate-700 cursor-pointer"
                                    >
                                      <Edit className="h-4 w-4 mr-2" />
                                      Edit
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem 
                                    onClick={() => {
                                      console.log('🗑️ DELETE BUTTON CLICKED for discussion:', discussion.id);
                                      handleDeleteDiscussion(discussion.id);
                                    }}
                                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10 cursor-pointer"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </div>
                        </div>

                        {editingPost === discussion.id ? (
                          <div className="mb-3">
                            <Input
                              value={editTitle}
                              onChange={(e) => setEditTitle(e.target.value)}
                              className="bg-slate-700/50 border-gray-600 text-white placeholder-gray-400"
                              placeholder="Update title..."
                            />
                          </div>
                        ) : (
                          <h3 className={`text-xl font-semibold mb-3 ${isDayMode ? 'text-slate-700' : 'text-white'}`}>
                            {(() => {
                              const href = titleLinkOverrides?.[discussion.title];
                              if (href) {
                                return (
                                  <a
                                    href={href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-cyan-300 hover:text-cyan-200 hover:underline"
                                  >
                                    {discussion.title}
                                  </a>
                                );
                              }
                              return discussion.title;
                            })()}
                          </h3>
                        )}

                        {editingPost === discussion.id ? (
                          <div className="mb-4 space-y-3">
                            <Textarea
                              value={editContent}
                              onChange={(e) => setEditContent(e.target.value)}
                              className="min-h-[120px] bg-slate-700/50 border-gray-600 text-white placeholder-gray-400"
                              placeholder="Update your post..."
                            />
                            <div className="flex items-center gap-2">
                              <Button
                                onClick={() => handleSaveEdit(discussion.id)}
                                disabled={isSavingEdit || !editContent.trim()}
                                className="bg-cyan-600 hover:bg-cyan-700 text-white"
                              >
                                {isSavingEdit ? 'Saving…' : 'Save'}
                              </Button>
                              <Button
                                variant="ghost"
                                onClick={handleCancelEdit}
                                disabled={isSavingEdit}
                                className="text-gray-300 hover:text-white"
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div 
                            className={`mb-4 leading-relaxed whitespace-pre-wrap cursor-pointer transition-colors ${
                              isDayMode ? 'text-slate-600 hover:text-slate-700' : 'text-gray-300 hover:text-gray-200'
                            }`}
                            onClick={() => setExpandedPost(expandedPost === discussion.id ? null : discussion.id)}
                          >
                            {(() => {
                              const cleaned = discussion.isSkoolHighlight
                                ? discussion.content.replace(/^🟦\s*Skool\s*Highlight\s*\n\n?/i, '')
                                : discussion.content;
                              return expandedPost === discussion.id ? cleaned : getTruncatedContent(cleaned);
                            })()}
                            {discussion.content.length > 150 && expandedPost !== discussion.id && (
                              <span className="text-cyan-400 ml-2 font-medium">Read more</span>
                            )}
                            {expandedPost === discussion.id && discussion.content.length > 150 && (
                              <span className="text-cyan-400 ml-2 font-medium">Show less</span>
                            )}
                          </div>
                        )}

                        <div className="flex items-center gap-6">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleLike(discussion.id)}
                            className={`flex items-center gap-2 hover:bg-red-500/10 transition-colors ${discussion.isLiked ? 'text-red-400' : 'text-gray-400 hover:text-red-400'}`}
                          >
                            <Heart className={`h-4 w-4 ${discussion.isLiked ? 'fill-current' : ''}`} />
                            {discussion.likes}
                          </Button>
                          
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => setSelectedDiscussion(discussion)}
                                className="flex items-center gap-2 text-gray-400 hover:bg-blue-500/10 hover:text-blue-300 transition-colors"
                              >
                                <MessageCircle className="h-4 w-4" />
                                {discussion.comments}
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="bg-slate-800 border-gray-700 max-w-2xl max-h-[80vh] overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle className="text-white">Comments - {discussion.title}</DialogTitle>
                              </DialogHeader>
                              
                              <div className="space-y-4 max-h-96 overflow-y-auto">
                                {comments[discussion.id]?.map((comment) => (
                                  <div key={comment.id} className="flex items-start gap-3">
                                    <div className="w-8 h-8 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                                      {comment.avatar}
                                    </div>
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-1">
                                        <span className="text-cyan-300 font-medium text-sm">{comment.author}</span>
                                        <span className="text-gray-400 text-xs">{comment.timeAgo}</span>
                                      </div>
                                      <p className="text-gray-300 text-sm">{comment.content}</p>
                                    </div>
                                  </div>
                                )) || (
                                  <p className="text-gray-400 text-center py-8">No comments yet. Be the first to comment!</p>
                                )}
                              </div>
                              
                              <div className="flex items-start gap-3 mt-4 pt-4 border-t border-gray-700">
                                <Avatar className="w-8 h-8 flex-shrink-0">
                                  {getUserAvatar() ? (
                                    <AvatarImage 
                                      src={getUserAvatar()!} 
                                      alt="Your avatar"
                                      className="object-cover w-full h-full"
                                    />
                                  ) : (
                                    <AvatarFallback className="bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-bold text-sm">
                                      {getUserInitials()}
                                    </AvatarFallback>
                                  )}
                                </Avatar>
                                <div className="flex-1 flex gap-2">
                                  <Textarea
                                    placeholder="Write a comment..."
                                    value={newComment}
                                    onChange={(e) => setNewComment(e.target.value)}
                                    className="flex-1 bg-slate-700/50 border-gray-600 text-white placeholder-gray-400 min-h-[80px]"
                                  />
                                  <Button
                                    onClick={handleAddComment}
                                    disabled={!newComment.trim()}
                                    className="bg-cyan-600 hover:bg-cyan-700 text-white self-end"
                                  >
                                    <Send className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
            )}
          </div>
        </div>
      </div>

      {/* Right Sidebar */}
      <div className="hidden lg:block w-80 flex-shrink-0">
        <div className="sticky top-6 space-y-6">
          <Card className="bg-slate-800/50 border-cyan-500/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
                <Users className="h-5 w-5 text-cyan-400" />
                Members
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
               <div className="flex justify-between items-center">
                  {isAdmin ? (
                    <button
                      onClick={() => setShowMembersList(true)}
                      className="text-gray-400 hover:text-cyan-300 transition-colors cursor-pointer"
                    >
                      Total Members
                    </button>
                  ) : (
                    <span className="text-gray-400">Total Members</span>
                  )}
                   <Badge className="bg-cyan-600/20 text-cyan-300 border-cyan-500/30">
                     {memberCountLoading ? '...' : memberCount}
                   </Badge>
                </div>
               <div className="flex justify-between items-center">
                 {isAdmin ? (
                   <div className="flex flex-col">
                     <span className="text-gray-400">Online Now</span>
                     {adminNames.length > 0 && (
                       <span className="text-xs text-green-300">
                         Admins: {adminNames.join(', ')}
                       </span>
                     )}
                   </div>
                 ) : (
                   <span className="text-gray-400">Online Now</span>
                 )}
                 <Badge className="bg-green-600/20 text-green-300 border-green-500/30">
                   {onlineLoading ? '...' : onlineCount}
                 </Badge>
               </div>
             </CardContent>
           </Card>

          <div className="max-h-[800px] overflow-y-auto">
            <NewsFeed isDayMode={isDayMode} />
          </div>

          <Card className="bg-slate-800/50 border-cyan-500/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-yellow-400" />
                30-Day Leaderboard
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-3">
                {/* Leaderboard entries */}
                <div className="flex items-center gap-3 p-2 rounded-lg bg-gradient-to-r from-yellow-500/10 to-amber-500/10 border border-yellow-500/20">
                  <Badge className="bg-yellow-500 text-black font-bold text-xs w-6 h-6 rounded-full flex items-center justify-center p-0">1</Badge>
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold text-sm">JD</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <span className="text-white font-medium text-sm truncate">Judith Dreher</span>
                    <div className="text-gray-400 font-semibold text-sm">+9 pts</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

        </div>
      </div>

      <MembersList
        open={showMembersList}
        onOpenChange={setShowMembersList}
        onMessageMember={(memberId, memberName) => {
          toast({
            title: "Message Member",
            description: `Starting conversation with ${memberName}`,
          });
        }}
      />
    </div>
  );
};
