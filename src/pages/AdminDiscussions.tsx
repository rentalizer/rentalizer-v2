import React, { useEffect, useMemo, useState } from 'react';
import { useAdminRole } from '@/hooks/useAdminRole';
import { GroupDiscussions } from '@/components/community/GroupDiscussions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Search, X, Pin } from 'lucide-react';

const AdminDiscussions: React.FC = () => {
  const { isAdmin, loading } = useAdminRole();
  const navigate = useNavigate();
  const [authorInput, setAuthorInput] = useState('');
  const [authorSearch, setAuthorSearch] = useState('');
  const [selectedAuthor, setSelectedAuthor] = useState<string | null>(null);
  const [loadingAuthors, setLoadingAuthors] = useState(true);
  const [authors, setAuthors] = useState<{ name: string; user_id: string | null; count: number; last_post_at?: string | null; avatar_url?: string | null; pinnedCount?: number; pinnedTitles?: string[] }[]>([]);
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

  // Helpers
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((w) => w.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Helper to format date/time nicely
  const formatDateTime = (iso?: string | null) => {
    if (!iso) return null;
    try {
      const d = new Date(iso);
      return d.toLocaleString(undefined, {
        year: 'numeric', month: 'short', day: '2-digit',
        hour: '2-digit', minute: '2-digit', hour12: true
      });
    } catch {
      return iso;
    }
  };

  // Load unique authors for Admin overview
  useEffect(() => {
    let active = true;
    const loadAuthors = async () => {
      try {
        setLoadingAuthors(true);
        const { data, error } = await supabase
          .from('discussions')
          .select('author_name, user_id, created_at, is_pinned, title');
        if (error) throw error;
        const map = new Map<string, { name: string; user_id: string | null; count: number; last_post_at: string | null; pinnedCount: number; pinnedTitles: string[] }>();
        const rows = (data ?? []) as { author_name: string | null; user_id: string | null; created_at: string; is_pinned?: boolean | null; title?: string | null }[];
        rows.forEach((row) => {
          const key = (row.author_name || 'Unknown').trim().toLowerCase();
          const display = (row.author_name || 'Unknown').trim();
          if (!map.has(key)) {
            map.set(key, { name: display, user_id: row.user_id ?? null, count: 1, last_post_at: row.created_at || null, pinnedCount: row.is_pinned ? 1 : 0, pinnedTitles: row.is_pinned && row.title ? [row.title] : [] });
          } else {
            const cur = map.get(key)!;
            cur.count += 1;
            // Track most recent created_at
            const prev = cur.last_post_at ? new Date(cur.last_post_at).getTime() : 0;
            const next = row.created_at ? new Date(row.created_at).getTime() : 0;
            if (next > prev) cur.last_post_at = row.created_at;
            if (row.is_pinned) {
              cur.pinnedCount += 1;
              if (row.title) {
                // Keep a small sample of distinct titles (max 3)
                if (!cur.pinnedTitles.includes(row.title)) {
                  cur.pinnedTitles.push(row.title);
                  if (cur.pinnedTitles.length > 3) cur.pinnedTitles = cur.pinnedTitles.slice(0, 3);
                }
              }
            }
          }
        });
        let list = Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));

        // Fetch avatars for users that have user_id
        const ids = list.map(a => a.user_id).filter((id): id is string => !!id);
        if (ids.length > 0) {
          const { data: profiles, error: profErr } = await supabase
            .from('profiles')
            .select('user_id, avatar_url')
            .in('user_id', ids);
          if (!profErr && profiles) {
            const avatarMap = new Map<string, string | null>();
            profiles.forEach((p: { user_id: string; avatar_url: string | null }) => {
              avatarMap.set(p.user_id, p.avatar_url);
            });
            list = list.map(a => ({ ...a, avatar_url: a.user_id ? avatarMap.get(a.user_id) ?? null : null }));
          }
        }
        if (active) setAuthors(list);
      } catch (e) {
        console.error('Failed to load authors', e);
        if (active) setAuthors([]);
      } finally {
        if (active) setLoadingAuthors(false);
      }
    };
    loadAuthors();
    return () => {
      active = false;
    };
  }, []);

  const filteredAuthors = useMemo(() => {
    const q = authorSearch.trim().toLowerCase();
    if (!q) return authors;
    return authors.filter((a) => a.name.toLowerCase().includes(q));
  }, [authors, authorSearch]);

  // Link overrides for specific member posts (Admin view only)
  const linkOverrides = useMemo(() => {
    const norm = (selectedAuthor || '').trim().toLowerCase();
    if (!norm) return null;
    switch (norm) {
      case 'robin christman':
        return {
          'Photographer with advice': 'https://www.skool.com/creativeairbnb/photographer-with-advice',
          'EIN # still not received': 'https://www.skool.com/creativeairbnb/ein-still-not-received',
          'One market at a time?...': 'http://skool.com/creativeairbnb/one-market-at-a-time',
          'Lmk what u think of my website....': 'https://www.skool.com/creativeairbnb/lmk-what-u-think-of-my-website',
        } as Record<string, string>;
      case 'ricardo-ellaine garriga':
        return {
          'SIC CODES': 'https://www.skool.com/creativeairbnb/sic-codes',
        };
      case 'kitt keberlein':
        return {
          'Getting Started': 'https://www.skool.com/creativeairbnb/getting-started',
          'New Member': 'https://www.skool.com/creativeairbnb/new-member',
        };
      case 'edward badal':
        return {
          'Financial update': 'https://www.skool.com/creativeairbnb/financial-update',
        };
      case 'john keenan':
        return {
          'Spam Calls': 'https://www.skool.com/creativeairbnb/spam-calls',
          'Go Daddy Plans?': 'https://www.skool.com/creativeairbnb/go-daddy-plans',
        };
      case 'd j':
        return {
          'Excited to Learn, Share, and Grow With This Community': 'https://www.skool.com/creativeairbnb/excited-to-learn-share-and-grow-with-this-community',
        };
      case 'carolyn reuben green':
        return {
          'Help with Website text': 'https://www.skool.com/creativeairbnb/help-with-website-text',
        };
      case 'sharon rochester':
        return {
          "I'm new and just joining the group": 'https://www.skool.com/creativeairbnb/im-new-and-just-joining-the-group',
        };
      case 'katissa lupoe':
        return {
          'Replays?': 'https://www.skool.com/creativeairbnb/replays',
        };
      case 'gary hard':
        return {
          'A non home address': 'http://skool.com/creativeairbnb/a-non-home-address',
        };
      case 'christine walton-watson':
        return {
          'Business Phone Number': 'https://www.skool.com/creativeairbnb/business-phone-number',
        };
      default:
        return null;
    }
  }, [selectedAuthor]);

  return (
    <div className="w-full max-w-none mx-auto py-6">
      {loading ? (
        <div className="max-w-5xl mx-auto py-10">
          <Card className="bg-slate-800/50 border-cyan-500/20">
            <CardHeader>
              <CardTitle className="text-white">Loading…</CardTitle>
            </CardHeader>
            <CardContent className="text-gray-300">Checking admin permissions</CardContent>
          </Card>
        </div>
      ) : !isAdmin && !isDevBypass ? (
        <div className="max-w-5xl mx-auto py-10">
          <Card className="bg-slate-800/50 border-cyan-500/20">
            <CardHeader>
              <CardTitle className="text-white">Access Denied</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-300 mb-4">You need admin privileges to manage discussions.</p>
              <Button onClick={() => navigate('/community')} className="bg-cyan-600 hover:bg-cyan-700 text-white">
                Go to Community
              </Button>
            </CardContent>
          </Card>
        </div>
      ) : (
        <>
          {/* Header with professional search */}
          <div className="mb-6">
            <div className="flex items-center justify-between gap-4">
              {/* Back button */}
              {selectedAuthor && (
                <Button
                  variant="ghost"
                  onClick={() => setSelectedAuthor(null)}
                  className="text-slate-300 hover:text-white hover:bg-slate-700/50 transition-all duration-200"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" /> Back to Members
                </Button>
              )}
              
              {/* Professional Search Box */}
              {!selectedAuthor && (
                <div className="flex-1 max-w-md ml-auto">
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                      <Search className="h-5 w-5 text-slate-400 group-focus-within:text-cyan-400 transition-colors duration-200" />
                    </div>
                    <Input
                      value={authorInput}
                      onChange={(e) => { const v = e.target.value; setAuthorInput(v); setAuthorSearch(v.trim()); }}
                      placeholder="Search members..."
                      className="pl-11 pr-12 h-12 bg-slate-800/60 backdrop-blur-sm border-slate-600/50 hover:border-slate-500/50 focus:border-cyan-500/50 text-slate-200 placeholder-slate-400 rounded-xl transition-all duration-200 focus:ring-2 focus:ring-cyan-500/20 focus:bg-slate-800/80"
                    />
                    {(authorSearch || authorInput) && (
                      <button
                        onClick={() => { setAuthorInput(''); setAuthorSearch(''); }}
                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-200 transition-colors duration-200"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                    {/* Search box glow effect */}
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-cyan-500/10 to-purple-500/10 opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                  </div>
                  
                  {/* Search results count */}
                  {authorSearch && (
                    <div className="mt-2 text-sm text-slate-400">
                      {filteredAuthors.length} member{filteredAuthors.length !== 1 ? 's' : ''} found
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Content */}
          {!selectedAuthor ? (
            <div className="space-y-6">
              {/* Header Section */}
              <div className="bg-gradient-to-r from-slate-900/80 to-slate-800/80 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-2">Discussion Members</h2>
                    <p className="text-slate-400">Select a member to view their posts and manage discussions</p>
                  </div>
                  <div className="text-slate-500">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Members Grid */}
              <div className="bg-gradient-to-br from-slate-900/60 via-slate-900/50 to-slate-800/40 backdrop-blur-sm border border-slate-700/30 shadow-2xl rounded-2xl p-8 relative overflow-hidden">
                {/* Animated background pattern */}
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/[0.02] via-transparent to-purple-500/[0.02] opacity-50"></div>
                <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-cyan-400/20 to-transparent"></div>
                {loadingAuthors ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="flex items-center space-x-3 text-slate-400">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-cyan-400"></div>
                      <span className="text-lg">Loading members...</span>
                    </div>
                  </div>
                ) : filteredAuthors.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4">
                      <svg className="w-8 h-8 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-slate-300 mb-2">No members found</h3>
                    <p className="text-slate-500">No discussion members match your search criteria</p>
                  </div>
                ) : (
                  <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 relative z-10">
                    {filteredAuthors.map((a) => (
                      <div
                        key={(a.user_id || a.name) + a.count}
                        onClick={() => setSelectedAuthor(a.name)}
                        className="group relative bg-gradient-to-br from-slate-800/70 via-slate-800/60 to-slate-900/70 hover:from-slate-700/80 hover:via-slate-700/70 hover:to-slate-800/80 border border-slate-600/30 hover:border-cyan-400/60 rounded-2xl p-6 cursor-pointer transition-all duration-500 hover:shadow-2xl hover:shadow-cyan-500/20 hover:-translate-y-1 hover:scale-[1.02] backdrop-blur-sm"
                      >
                        {/* Enhanced hover effects */}
                        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/8 via-purple-500/6 to-cyan-500/8 rounded-2xl opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
                        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-sm -z-10"></div>
                        
                        <div className="relative flex items-center space-x-4">
                          {/* Enhanced Avatar */}
                          <div className="relative">
                            <div className="relative">
                              <Avatar className="w-16 h-16 ring-2 ring-slate-600/50 group-hover:ring-cyan-400/80 group-hover:ring-4 transition-all duration-500 group-hover:shadow-lg group-hover:shadow-cyan-400/25">
                                {a.avatar_url ? (
                                  <AvatarImage src={a.avatar_url} alt={a.name} className="object-cover transition-transform duration-300 group-hover:scale-110" />
                                ) : null}
                                <AvatarFallback className="bg-gradient-to-br from-cyan-500 via-cyan-600 to-purple-600 text-white font-bold text-lg transition-all duration-300 group-hover:from-cyan-400 group-hover:to-purple-500">
                                  {getInitials(a.name)}
                                </AvatarFallback>
                              </Avatar>
                              {/* Animated ring effect */}
                              <div className="absolute inset-0 rounded-full border-2 border-cyan-400/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                            </div>
                            {/* Enhanced online indicator */}
                            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-gradient-to-r from-green-400 to-green-500 border-2 border-slate-800 rounded-full shadow-lg shadow-green-500/30"></div>
                          </div>

                          {/* Enhanced Member Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-bold text-xl text-white group-hover:text-cyan-300 transition-all duration-300 truncate group-hover:tracking-wide">
                                {a.name}
                              </h3>
                            </div>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-700/50 group-hover:bg-cyan-900/30 rounded-full transition-colors duration-300">
                                  <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full"></div>
                                  <span className="text-xs font-medium text-slate-300 group-hover:text-cyan-300 transition-colors">
                                    {a.count} {a.count === 1 ? 'post' : 'posts'}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-700/50 group-hover:bg-green-900/30 rounded-full transition-colors duration-300">
                                  <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
                                  <span className="text-xs font-medium text-slate-400 group-hover:text-green-300 transition-colors">
                                    Active
                                  </span>
                                </div>
                              </div>
                              {a.last_post_at && (
                                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-700/30 group-hover:bg-purple-900/20 rounded-full transition-colors duration-300">
                                  <div className="w-1.5 h-1.5 bg-purple-400 rounded-full"></div>
                                  <span className="text-xs text-slate-500 group-hover:text-purple-300 transition-colors font-medium">
                                    {formatDateTime(a.last_post_at)}
                                  </span>
                                </div>
                              )}
                              {a.pinnedCount && a.pinnedCount > 0 ? (
                                <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                  <div className="flex items-center gap-1.5 px-2 py-0.5 bg-yellow-500/10 border border-yellow-400/30 text-yellow-300 rounded-full">
                                    <Pin className="w-3 h-3" />
                                    <span className="text-xs font-semibold">Pinned: {a.pinnedCount}</span>
                                  </div>
                                  {a.pinnedTitles?.slice(0,2).map((t, idx) => (
                                    <span key={idx} className="max-w-[210px] truncate px-2 py-0.5 text-[11px] text-slate-300 bg-slate-700/40 rounded-full border border-slate-600/40" title={t}>
                                      {t}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5 mt-1">
                                  <span className="px-2 py-0.5 text-[11px] text-slate-400 bg-slate-700/30 rounded-full border border-slate-600/30">
                                    No pinned post
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Enhanced Arrow indicator */}
                          <div className="flex flex-col items-center justify-center">
                            <div className="text-slate-500 group-hover:text-cyan-400 transition-all duration-300 group-hover:scale-110 group-hover:translate-x-1">
                              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                              </svg>
                            </div>
                            <div className="w-8 h-0.5 bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 mt-1"></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div>
              {/* Show only the selected member's posts using existing component */}
              <GroupDiscussions 
                disablePosting 
                forceTagLabel="Skool"
                authorFilter={selectedAuthor}
                skoolLinkOverrides={linkOverrides || undefined}
                allowAdminPinAll
                adminCanPin
              />
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AdminDiscussions;
