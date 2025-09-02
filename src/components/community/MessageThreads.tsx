import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageSquare, Search, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminRole } from '@/hooks/useAdminRole';

interface DirectMessage {
  id: string;
  sender_id: string;
  recipient_id: string;
  sender_name: string;
  message: string;
  created_at: string;
  read_at: string | null;
}

export const MessageThreads = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<{ [key: string]: { avatar_url: string | null; display_name: string | null; first_name: string | null; last_name: string | null } }>({});
  const { toast } = useToast();
  const { user } = useAuth();
  const { isAdmin } = useAdminRole();

  useEffect(() => {
    fetchMessages();
  }, []);

  const fetchMessages = async () => {
    try {
      // Fetch direct messages
      const { data: messagesData, error: messagesError } = await supabase
        .from('direct_messages')
        .select('*')
        .order('created_at', { ascending: false });

      if (messagesError) throw messagesError;
      
      // Get unique user IDs from messages
      const userIds = [...new Set(messagesData?.map(msg => msg.sender_id) || [])];
      
      // Fetch profiles for these users if any exist
      let profilesMap: { [key: string]: any } = {};
      if (userIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('user_id, avatar_url, display_name, first_name, last_name')
          .in('user_id', userIds);

        if (!profilesError && profilesData) {
          profilesMap = profilesData.reduce((acc, profile) => {
            acc[profile.user_id] = profile;
            return acc;
          }, {} as { [key: string]: any });
          setProfiles(profilesMap);
        }
      }

      console.log('Direct messages data:', messagesData);
      setMessages(messagesData || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast({
        title: "Error",
        description: "Failed to load messages",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteMessage = async (messageId: string) => {
    try {
      const { error } = await supabase
        .from('direct_messages')
        .delete()
        .eq('id', messageId);

      if (error) throw error;

      toast({
        title: "Message Deleted",
        description: "The message has been removed successfully.",
      });

      // Refresh messages
      fetchMessages();
    } catch (error) {
      console.error('Error deleting message:', error);
      toast({
        title: "Error",
        description: "Failed to delete message",
        variant: "destructive",
      });
    }
  };

  const canDeleteMessage = (message: DirectMessage) => {
    return isAdmin || (user && message.sender_id === user.id);
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  const filteredMessages = messages.filter(message =>
    message.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
    message.sender_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-300 mb-2">Loading messages...</h3>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <h2 className="text-2xl font-bold text-cyan-300">Direct Messages</h2>
        <Badge variant="outline" className="border-cyan-500/30 text-cyan-300">
          {messages.length} messages
        </Badge>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search messages..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 bg-slate-800/50 border-cyan-500/20 text-white placeholder-gray-400"
        />
      </div>

      {/* Direct Messages */}
      <div className="space-y-4">
        {filteredMessages.map(message => (
          <Card key={message.id} className="bg-slate-800/50 border-cyan-500/20 hover:border-cyan-500/40 transition-colors">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                {/* Avatar */}
                <Avatar className="w-12 h-12 flex-shrink-0">
                  <AvatarImage 
                    src={profiles[message.sender_id]?.avatar_url || ''} 
                    alt={message.sender_name}
                  />
                  <AvatarFallback className="bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-bold">
                    {getInitials(message.sender_name)}
                  </AvatarFallback>
                </Avatar>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-cyan-300 font-medium">{message.sender_name}</span>
                    </div>
                    <span className="text-sm text-gray-400 flex-shrink-0">{formatTimeAgo(message.created_at)}</span>
                  </div>

                  <p className="text-gray-300 mb-3">{message.message}</p>

                  {/* Actions */}
                  <div className="flex items-center justify-end">
                    {canDeleteMessage(message) && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => deleteMessage(message.id)}
                        className="text-gray-400 hover:text-red-400 h-8 px-2"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredMessages.length === 0 && (
        <Card className="bg-slate-800/50 border-cyan-500/20">
          <CardContent className="text-center py-12">
            <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-300 mb-2">No messages found</h3>
            <p className="text-gray-400">Try adjusting your search terms</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};