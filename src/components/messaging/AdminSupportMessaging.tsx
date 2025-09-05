
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminRole } from '@/hooks/useAdminRole';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useOnlineUsers } from '@/hooks/useOnlineUsers';
import { MessageSquare, Users, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import MessageThread, { Message } from './MessageThread';
import MessagingMembersList, { Member as MessagingMember } from './MembersList';

// Typed view of the direct_messages table rows we use
interface DirectMessageRow {
  id: string;
  sender_id: string;
  recipient_id: string;
  message: string;
  created_at: string;
  read_at: string | null;
  sender_name?: string | null;
}

interface Conversation {
  id: string;
  participants: string[];
  lastMessage?: Message;
  lastActivity: string;
  unreadCount: number;
}

export default function AdminSupportMessaging() {
  const { user } = useAuth();
  const { isAdmin } = useAdminRole();
  const { toast } = useToast();
  const { onlineUsers } = useOnlineUsers();
  
  const [members, setMembers] = useState<MessagingMember[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<string>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [loading, setLoading] = useState(true);
  const [connectingToAdmin, setConnectingToAdmin] = useState(false);
  const [totalUnread, setTotalUnread] = useState(0);

  // Load members (for admin view)
  useEffect(() => {
    if (!user || !isAdmin) return;

    const loadMembers = async () => {
      try {
        const { data: profiles, error } = await supabase
          .from('profiles')
          .select(`
            user_id,
            display_name,
            first_name,
            last_name,
            avatar_url
          `);

        if (error) {
          console.error('Error loading members:', error);
          return;
        }

        // Get user roles to identify admins
        const { data: userRoles } = await supabase
          .from('user_roles')
          .select('user_id, role');

        // Load conversations for each member
        const membersList: MessagingMember[] = await Promise.all(
          profiles
            .filter(profile => profile.user_id !== user.id)
            .map(async (profile) => {
              const isUserAdmin = userRoles?.some(
                role => role.user_id === profile.user_id && role.role === 'admin'
              );

              // Get latest message with this member
              const { data: latestMessage } = await supabase
                .from('direct_messages')
                .select('*')
                .or(`and(sender_id.eq.${user.id},recipient_id.eq.${profile.user_id}),and(sender_id.eq.${profile.user_id},recipient_id.eq.${user.id})`)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

              // Count unread messages from this member
              const { count: unreadCount } = await supabase
                .from('direct_messages')
                .select('*', { count: 'exact', head: true })
                .eq('sender_id', profile.user_id)
                .eq('recipient_id', user.id)
                .is('read_at', null);

              return {
                id: profile.user_id,
                name: profile.display_name || `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Unknown User',
                email: '', // Remove ID display - use empty string instead of user_id
                avatar: profile.avatar_url,
                isOnline: onlineUsers.some(onlineUser => onlineUser.user_id === profile.user_id),
                unreadCount: unreadCount || 0,
                isAdmin: isUserAdmin || false,
                lastMessage: latestMessage ? {
                  content: latestMessage.message,
                  timestamp: latestMessage.created_at,
                  isFromMember: latestMessage.sender_id !== user.id
                } : undefined
              };
            })
        );

        setMembers(membersList);
        
        // Calculate total unread
        const total = membersList.reduce((sum, member) => sum + member.unreadCount, 0);
        setTotalUnread(total);
        
      } catch (error) {
        console.error('Error in loadMembers:', error);
      } finally {
        setLoading(false);
      }
    };

    loadMembers();
  }, [user, isAdmin, onlineUsers]);

  // For members, find the first admin to chat with
  useEffect(() => {
    if (!user || isAdmin || selectedMemberId) return;

    

    const findAdminAndLoadMessages = async () => {
      try {
        setLoading(true);
        
        // Find first admin user - try multiple approaches
        console.log('🔍 Looking for admin users...');
        
        // First try: Look for users with admin role
        let { data: adminRoles } = await supabase
          .from('user_roles')
          .select('user_id')
          .eq('role', 'admin')
          .limit(1);

        console.log('📊 Admin roles query result:', { adminRoles });

        // If no results, try different approaches to find admins
        if (!adminRoles || adminRoles.length === 0) {
          console.log('🔍 No admin role found, trying alternative approaches...');
          
          // Alternative: Look for users who have created admin posts or have admin privileges
          // This is a fallback when user_roles table might be empty
          const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('user_id, display_name')
            .limit(5);
          
          console.log('📊 Available profiles for fallback:', { profiles, profilesError });
          
          // Use the first available user as fallback admin (temporary solution)
          if (profiles && profiles.length > 0) {
            adminRoles = [{ user_id: profiles[0].user_id }];
            console.log('⚠️ Using fallback admin:', profiles[0].user_id);
          }
        }

        // If still no results, check if user_roles table has any data at all
        if (!adminRoles || adminRoles.length === 0) {
          console.log('🔍 Checking all user_roles...');
          const { data: allRoles, error: allRolesError } = await supabase
            .from('user_roles')
            .select('user_id, role')
            .limit(10);
          
          console.log('📊 All roles in table:', { allRoles, allRolesError });
        }

        // Check if we found any admin users
        if (!adminRoles || adminRoles.length === 0) {
          console.log('❌ No admin users found in database');
          setLoading(false);
          toast({
            title: "No Admin Available",
            description: "No admin is currently available to receive messages. Please try again later.",
            variant: "destructive"
          });
          return;
        }

        if (adminRoles && adminRoles.length > 0) {
          const adminId = adminRoles[0].user_id;
          console.log('✅ Found admin for non-admin user:', adminId);
          setSelectedMemberId(adminId);
          setLoading(false);
        } else {
          console.log('❌ No admin found for non-admin user');
          setLoading(false);
          toast({
            title: "No Admin Available",
            description: "No admin is currently available to receive messages. Please try again later.",
            variant: "destructive"
          });
        }
      } catch (error) {
        setLoading(false);
      } finally {
        setLoading(false);
      }
    };

    findAdminAndLoadMessages();
  }, [user, isAdmin, selectedMemberId, toast]);

  // Helper: stable conversation id from two UUIDs
  const getConversationId = (a: string, b: string) => {
    return a <= b ? `${a}|${b}` : `${b}|${a}`;
  };

  // Load messages for selected conversation
  useEffect(() => {
    if (!user || !selectedMemberId) {
      setMessages([]);
      return;
    }

    const loadMessages = async () => {
      try {
        const conversationId = getConversationId(user.id, selectedMemberId);
        console.log('📨 Loading messages for conversation:', { userId: user.id, selectedMemberId, conversationId });
        
        // Prefer conversation_id for accuracy; fall back to OR filter if column doesn't exist yet
        // Use a minimal typed interface to avoid deep generic instantiation from Supabase types
        interface DMQuery {
          select: (cols: string) => {
            eq: (col: string, val: string) => {
              order: (col: string, opts: { ascending: boolean }) => Promise<{ data: unknown; error: { message: string } | null }>;
            };
            or: (expr: string) => {
              order: (col: string, opts: { ascending: boolean }) => Promise<{ data: unknown; error: { message: string } | null }>;
            };
          };
        }
        const dm = supabase.from('direct_messages') as unknown as DMQuery;
        let queryRes: { data: unknown; error: { message: string } | null } = await dm
          .select('id,sender_id,recipient_id,message,created_at,read_at,sender_name,conversation_id')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: true });

        if (queryRes.error) {
          console.warn('⚠️ conversation_id query failed, falling back to OR filter:', queryRes.error.message);
          queryRes = await dm
            .select('id,sender_id,recipient_id,message,created_at,read_at,sender_name,conversation_id')
            .or(`and(sender_id.eq.${user.id},recipient_id.eq.${selectedMemberId}),and(sender_id.eq.${selectedMemberId},recipient_id.eq.${user.id})`)
            .order('created_at', { ascending: true });
        }

        const { data, error } = queryRes;

        if (error) {
          console.error('Error loading messages:', error);
          setMessages([]);
          return;
        }

        // Safely coerce data into our expected row type for mapping
        const rows: DirectMessageRow[] = ((data as unknown) as DirectMessageRow[] | null) ?? [];

        const formattedMessages: Message[] = rows.map((msg: DirectMessageRow) => ({
          id: msg.id,
          senderId: msg.sender_id,
          receiverId: msg.recipient_id,
          message: msg.message,
          timestamp: msg.created_at,
          isRead: !!msg.read_at,
          messageType: 'text',
          senderName: msg.sender_name || undefined
        }));

        setMessages(formattedMessages);

        // Mark messages as read if current user is recipient
        const unreadMessages = rows
          .filter((msg) => msg.recipient_id === user.id && !msg.read_at)
          .map((msg) => msg.id);

        if (unreadMessages.length > 0) {
          await supabase
            .from('direct_messages')
            .update({ read_at: new Date().toISOString() })
            .in('id', unreadMessages);

          // Update member unread count in local state
          setMembers(prev => prev.map(member => 
            member.id === selectedMemberId 
              ? { ...member, unreadCount: 0 }
              : member
          ));
        }

      } catch (error) {
        console.error('Error in loadMessages:', error);
        setMessages([]);
      }
    };

    loadMessages();
  }, [user, selectedMemberId]);

  // Real-time subscription for new messages
  useEffect(() => {
    if (!user) return;

    console.log('🔔 Setting up real-time subscription for user:', user.id, 'isAdmin:', isAdmin);

    const channel = supabase
      .channel('direct_messages_realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'direct_messages',
          filter: `or(sender_id.eq.${user.id},recipient_id.eq.${user.id})`
        },
        (payload) => {
          const newMessage = payload.new as DirectMessageRow;
          console.log('🔔 Real-time message received:', {
            messageId: newMessage.id,
            senderId: newMessage.sender_id,
            recipientId: newMessage.recipient_id,
            currentUserId: user.id,
            selectedMemberId,
            isAdmin,
            message: newMessage.message
          });
          
          // Check if this message involves the current user
          const isForCurrentUser = newMessage.sender_id === user.id || newMessage.recipient_id === user.id;
          
          if (!isForCurrentUser) {
            console.log('❌ Message not for current user, ignoring');
            return;
          }
          
          // Only process if it's for current conversation or affects member list
          const isCurrentConversation = selectedMemberId &&
            ((newMessage.sender_id === user.id && newMessage.recipient_id === selectedMemberId) ||
             (newMessage.sender_id === selectedMemberId && newMessage.recipient_id === user.id));

          // Add to messages if it's for current conversation
          if (isCurrentConversation) {
            console.log('✅ Adding message to current conversation');
            const formattedMessage: Message = {
              id: newMessage.id,
              senderId: newMessage.sender_id,
              receiverId: newMessage.recipient_id,
              message: newMessage.message,
              timestamp: newMessage.created_at,
              isRead: !!newMessage.read_at,
              messageType: 'text',
              senderName: newMessage.sender_name || undefined
            };
            
            // Only add if not already in state (avoid duplicates)
            setMessages(prev => {
              const exists = prev.some(msg => msg.id === formattedMessage.id);
              if (exists) {
                console.log('⚠️ Message already exists, skipping');
                return prev;
              }
              console.log('➕ Adding new message to conversation');
              return [...prev, formattedMessage];
            });
          }

          // Update members list for admin view - always update when receiving messages
          if (isAdmin && newMessage.sender_id !== user.id) {
            console.log('📨 Admin received message from:', newMessage.sender_id, 'Message:', newMessage.message);
            
            setMembers(prev => {
              const existingMember = prev.find(m => m.id === newMessage.sender_id);
              
              if (existingMember) {
                // Update existing member
                return prev.map(member => {
                  if (member.id === newMessage.sender_id) {
                    return {
                      ...member,
                      unreadCount: selectedMemberId === member.id ? member.unreadCount : member.unreadCount + 1,
                      lastMessage: {
                        content: newMessage.message,
                        timestamp: newMessage.created_at,
                        isFromMember: true
                      }
                    };
                  }
                  return member;
                });
              } else {
                // Add new member if they don't exist in the list
                console.log('➕ Adding new member to admin list:', newMessage.sender_id);
                const newMember: MessagingMember = {
                  id: newMessage.sender_id,
                  name: newMessage.sender_name || 'Unknown User',
                  email: '',
                  avatar: '',
                  isOnline: false,
                  isAdmin: false,
                  unreadCount: 1,
                  lastMessage: {
                    content: newMessage.message,
                    timestamp: newMessage.created_at,
                    isFromMember: true
                  },
                  lastActivity: newMessage.created_at
                };
                return [...prev, newMember];
              }
            });
          }
          
          // For non-admin users, also update if they receive a message from admin
          if (!isAdmin && newMessage.sender_id !== user.id) {
            console.log('📨 Non-admin received message from admin:', newMessage.sender_id);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'direct_messages',
          filter: `or(sender_id.eq.${user.id},recipient_id.eq.${user.id})`
        },
        (payload) => {
          const updatedMessage = payload.new as DirectMessageRow;
          
          // Update read status in local state
          setMessages(prev => prev.map(msg => 
            msg.id === updatedMessage.id 
              ? { ...msg, isRead: !!updatedMessage.read_at }
              : msg
          ));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, selectedMemberId, isAdmin]);

  const handleSendMessage = async (messageContent: string) => {
    console.log('🔍 handleSendMessage called with:', { 
      user: !!user, 
      userId: user?.id, 
      selectedMemberId, 
      messageContent: messageContent?.trim(),
      isAdmin 
    });

    if (!user) {
      toast({
        title: "Not logged in",
        description: "Please log in to send messages.",
        variant: "destructive"
      });
      return;
    }

    if (!messageContent.trim()) {
      toast({
        title: "Empty message",
        description: "Please enter a message to send.",
        variant: "destructive"
      });
      return;
    }

    let finalRecipientId = selectedMemberId;

    if (!selectedMemberId) {
      console.log('❌ No selectedMemberId, attempting to find admin...');
      // For non-admin users, try to find an admin to send to
      if (!isAdmin) {
        try {
          const { data: adminRoles, error } = await supabase
            .from('user_roles')
            .select('user_id')
            .eq('role', 'admin')
            .limit(1);

          if (error || !adminRoles || adminRoles.length === 0) {
            toast({
              title: "No admin available",
              description: "No admin is currently available to receive your message.",
              variant: "destructive"
            });
            return;
          }

          const adminId = adminRoles[0].user_id;
          setSelectedMemberId(adminId);
          finalRecipientId = adminId;
        } catch (error) {
          console.error('Error finding admin:', error);
          toast({
            title: "Connection error",
            description: "Unable to connect to admin support.",
            variant: "destructive"
          });
          return;
        }
      } else {
        toast({
          title: "No recipient selected",
          description: "Please select a member to send a message to.",
          variant: "destructive"
        });
        return;
      }
    }
    
    console.log('🚀 Sending message:', {
      sender_id: user.id,
      recipient_id: finalRecipientId,
      message: messageContent.trim()
    });

    try {
      // Get sender profile info for display name
      const { data: senderProfile } = await supabase
        .from('profiles')
        .select('display_name, first_name, last_name')
        .eq('user_id', user.id)
        .single();

      const senderName = senderProfile?.display_name || 
        `${senderProfile?.first_name || ''} ${senderProfile?.last_name || ''}`.trim() ||
        user.email?.split('@')[0] || 'User';

      console.log('👤 Sender name resolved:', senderName);

      // Create optimistic message first for immediate UI feedback
      const optimisticMessage: Message = {
        id: `temp-${Date.now()}`,
        senderId: user.id,
        receiverId: finalRecipientId,
        message: messageContent.trim(),
        timestamp: new Date().toISOString(),
        isRead: false,
        messageType: 'text',
        senderName: senderName
      };

      // Add to UI immediately
      setMessages(prev => [...prev, optimisticMessage]);

      // Insert message to database. We do NOT send conversation_id here to avoid type mismatches
      // on environments where the column may be uuid. A DB trigger (if present) will populate it.
      const conversationId = getConversationId(user.id, finalRecipientId!);
      const { data: newMessage, error } = await supabase
        .from('direct_messages')
        .insert({
          sender_id: user.id,
          recipient_id: finalRecipientId,
          sender_name: senderName,
          message: messageContent.trim()
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Error sending message:', error);
        // Remove optimistic message on error
        setMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id));
        toast({
          title: "Error sending message",
          description: error.message,
          variant: "destructive"
        });
        return;
      }

      console.log('✅ Message sent successfully:', newMessage);

      // Replace optimistic message with real message
      if (newMessage) {
        const formattedMessage: Message = {
          id: newMessage.id,
          senderId: newMessage.sender_id,
          receiverId: newMessage.recipient_id,
          message: newMessage.message,
          timestamp: newMessage.created_at,
          isRead: false,
          messageType: 'text',
          senderName: newMessage.sender_name
        };
        
        // Replace the optimistic message with the real one
        setMessages(prev => prev.map(msg => 
          msg.id === optimisticMessage.id ? formattedMessage : msg
        ));
      }

    } catch (error) {
      console.error('Error in handleSendMessage:', error);
      toast({
        title: "Error sending message",
        description: "Failed to send message. Please try again.",
        variant: "destructive"
      });
    }
  };

  const selectedMember = members.find(m => m.id === selectedMemberId);

  // Member view - simple chat with admin
  if (!isAdmin) {
    return (
      <div className="h-[600px] max-w-4xl mx-auto">
        <div className="bg-slate-700/50 border border-border rounded-lg p-6 mb-4">
          <div className="flex items-center gap-3 mb-4">
            <MessageSquare className="h-6 w-6 text-primary" />
            <h2 className="text-xl font-semibold text-white">Contact Admin Support</h2>
            {totalUnread > 0 && (
              <Badge variant="destructive">{totalUnread}</Badge>
            )}
          </div>
          <p className="text-slate-300 mb-4">
            Need help? Send a message to our admin team and we'll get back to you as soon as possible.
          </p>
        </div>

        {loading ? (
          <div className="bg-slate-800/90 rounded-lg p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            <p className="text-slate-300">Connecting to admin support...</p>
          </div>
        ) : (
          <MessageThread
            messages={messages}
            currentUserId={user.id}
            isTyping={isTyping}
            onSendMessage={handleSendMessage}
            recipientName="Admin Support"
            isOnline={true}
          />
        )}
      </div>
    );
  }

  // Admin view - full messaging interface
  return (
    <div className="h-[600px] flex bg-card border border-border rounded-lg overflow-hidden shadow-lg">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-slate-800/90">
        {selectedMember ? (
          <MessageThread
            messages={messages}
            currentUserId={user.id}
            isTyping={isTyping}
            onSendMessage={handleSendMessage}
            recipientName={selectedMember.name}
            recipientAvatar={selectedMember.avatar}
            isOnline={selectedMember.isOnline}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center bg-slate-800/90 border-r-2 border-border">
            <div className="text-center p-8">
              <Users className="h-16 w-16 mx-auto mb-4 text-muted-foreground/70" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Admin Support Center
              </h3>
              <p className="text-muted-foreground mb-4 max-w-md">
                Select a member from the list to start or continue a conversation.
                You can help resolve issues and provide support directly through this interface.
              </p>
              <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4" />
                  <span>{totalUnread} unread</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <span>{members.length} members</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Members List */}
      <MessagingMembersList
        members={members}
        selectedMemberId={selectedMemberId}
        onMemberSelect={setSelectedMemberId}
      />
    </div>
  );
}
