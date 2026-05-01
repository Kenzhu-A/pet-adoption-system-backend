const supabase = require('../config/supabaseClient');

// Get all users EXCEPT the currently logged-in user

const getUsers = async (req, res) => {
    try {
        const { currentUserId } = req.params;
        
        if (!currentUserId) throw new Error("currentUserId is required");

        // Fetch ALL users except the current user
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .neq('id', currentUserId);

        if (error) throw error;
        res.status(200).json(data);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};


// Get chat history between two specific users
const getMessages = async (req, res) => {
    const { user1, user2 } = req.params;
    try {
        const { data, error } = await supabase
            .from('messages')
            .select('*')
            .or(`and(sender_id.eq.${user1},receiver_id.eq.${user2}),and(sender_id.eq.${user2},receiver_id.eq.${user1})`)
            .order('created_at', { ascending: true });

        if (error) throw error;
        res.status(200).json(data);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};
const deleteMessage = async (req, res) => {
    const { messageId } = req.params;
    const { requesterId } = req.body || {};
    const requester = requesterId || req.query.requesterId;
    try {
        const io = req.app.get('io');
        const { data: message, error: fetchError } = await supabase
            .from('messages')
            .select('id, sender_id, receiver_id')
            .eq('id', messageId)
            .single();

        // Treat missing message as already deleted (idempotent delete)
        if (fetchError || !message) {
            return res.status(200).json({ message: 'Message not found or already deleted' });
        }
        if (requester && message.sender_id !== requester) {
            return res.status(403).json({ error: 'You can only delete your own messages' });
        }

        const { data: deletedRows, error } = await supabase
            .from('messages')
            .delete()
            .eq('id', messageId)
            .select('id');
        if (error) throw error;
        if (!deletedRows || deletedRows.length === 0) {
            return res.status(200).json({ message: 'Message not found or already deleted' });
        }
        if (io) {
            io.to(message.sender_id).emit('message_deleted', { messageId });
            io.to(message.receiver_id).emit('message_deleted', { messageId });
        }
        res.status(200).json({ message: 'Message deleted' });
    } catch (error) { res.status(400).json({ error: error.message }); }
};

const deleteConversation = async (req, res) => {
    const { user1, user2 } = req.params;
    const { requesterId, scope } = req.body || {};
    const requester = requesterId || req.query.requesterId;
    const deleteScope = scope || req.query.scope;
    try {
        const io = req.app.get('io');

        // [USER-REPORT-MODERATION] Admin moderation deletes remove the whole thread for both users.
        if (deleteScope === 'all') {
            const { data: deletedRows, error } = await supabase
                .from('messages')
                .delete()
                .or(`and(sender_id.eq.${user1},receiver_id.eq.${user2}),and(sender_id.eq.${user2},receiver_id.eq.${user1})`)
                .select('id');
            if (error) throw error;

            if (io) {
                const payload = { user1, user2, deletedBy: 'admin', scope: 'all' };
                io.to(user1).emit('conversation_deleted', payload);
                io.to(user2).emit('conversation_deleted', payload);
            }
            return res.status(200).json({ message: 'Conversation deleted for both users', deletedCount: deletedRows?.length || 0 });
        }

        if (!requester) {
            return res.status(400).json({ error: 'requesterId is required for user-scoped conversation deletion' });
        }
        if (requester !== user1 && requester !== user2) {
            return res.status(403).json({ error: 'Not allowed to delete this conversation' });
        }

        // [CHAT-MENU] Instead of deleting messages, mark conversation as deleted for the requesting user
        // This way the other user can still see the conversation
        // [CONVERSATION-DELETE-FIX] Handle unique constraint violation for idempotent deletion
        const { data, error } = await supabase.from('conversation_deletions')
            .insert([{ user_id: requester, conversation_user1: user1, conversation_user2: user2 }])
            .select();

        if (error) {
            // Handle unique constraint violation - conversation already marked as deleted
            // This makes the delete operation idempotent (safe to call multiple times)
            if (error.message.includes('duplicate key value violates unique constraint') ||
                error.message.includes('conversation_deletions_user_id_conversation_user1_conversation_user2_key')) {
                // Conversation already deleted for this user - treat as success (idempotent operation)
                console.log('Conversation already deleted for user:', requester);
            } else {
                throw error;
            }
        }

        // Notify the requester that their conversation was deleted
        if (io) {
            const payload = { user1, user2, deletedBy: requester || null };
            io.to(requester).emit('conversation_deleted', payload);
        }
        // [CONVERSATION-DELETE-FIX] Consistent response whether new deletion or existing
        const successMessage = data ? 'Conversation deleted for you' : 'Conversation already deleted for you';
        res.status(200).json({ message: successMessage, deletedCount: data ? 1 : 0 });
    } catch (error) {
        // Fallback: if the table doesn't exist, still allow deletion (for backward compatibility)
        if (error.message.includes('relation') || error.message.includes('does not exist')) {
            return res.status(200).json({ message: 'Conversation deleted', fallback: true });
        }
        res.status(400).json({ error: error.message });
    }
};

const getConversations = async (req, res) => {
    const { userId } = req.params;
    const includeDeleted = req.query.includeDeleted === 'true';
    try {
        // [DASHBOARD-REDESIGN] fixed: messages FK points to auth.users not public.users,
        // so we cannot use FK hints. Fetch messages then batch-lookup public.users separately.
        const { data: messages, error } = await supabase
            .from('messages')
            .select('*')
            .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
            .order('created_at', { ascending: false });

        if (error) throw error;

        // [CHAT-MENU] Fetch conversations deleted by the current user
        // Gracefully handle if the table doesn't exist yet
        let deletedConvos = [];
        if (!includeDeleted) {
            try {
                const { data, error: deleteError } = await supabase
                    .from('conversation_deletions')
                    .select('conversation_user1, conversation_user2')
                    .eq('user_id', userId);
                if (!deleteError) deletedConvos = data || [];
            } catch (e) {
                // Table doesn't exist yet — continue without filtering
                deletedConvos = [];
            }
        }

        const deletedConvoSet = new Set();
        (deletedConvos || []).forEach(d => {
            // [CONVERSATION-DELETE-FIX] Use consistent sorted key format
            const key = d.conversation_user1 < d.conversation_user2
                ? `${d.conversation_user1}|${d.conversation_user2}`
                : `${d.conversation_user2}|${d.conversation_user1}`;
            deletedConvoSet.add(key); // One consistent sorted key per pair
        });

        // Collect unique partner IDs
        const partnerIds = new Set();
        for (const msg of messages) {
            const partnerId = msg.sender_id === userId ? msg.receiver_id : msg.sender_id;
            // [CHAT-MENU] Skip if conversation was deleted by current user
            const convoKey = userId < partnerId ? `${userId}|${partnerId}` : `${partnerId}|${userId}`;
            if (!deletedConvoSet.has(convoKey)) {
                partnerIds.add(partnerId);
            }
        }

        // Batch-fetch partner profiles from public.users
        const partnerIdList = Array.from(partnerIds);
        let usersMap = {};
        if (partnerIdList.length > 0) {
            const { data: users } = await supabase
                .from('users')
                .select('id, full_name, avatar_url, email')
                .in('id', partnerIdList);
            (users || []).forEach(u => { usersMap[u.id] = u; });
        }

        // Build conversations list (one entry per unique partner, latest message first)
        const conversations = [];
        const seen = new Set();
        for (const msg of messages) {
            const isSender = msg.sender_id === userId;
            const partnerId = isSender ? msg.receiver_id : msg.sender_id;
            const convoKey = userId < partnerId ? `${userId}|${partnerId}` : `${partnerId}|${userId}`;
            // [USER-REPORT-MODERATION] Admin inspect can include user-hidden conversations.
            if (!seen.has(partnerId) && !deletedConvoSet.has(convoKey)) {
                seen.add(partnerId);
                const partner = usersMap[partnerId] || {};
                conversations.push({
                    partnerId,
                    partnerName: partner.full_name || partner.email || 'Unknown User',
                    partnerAvatar: partner.avatar_url || null,
                    latestMessage: msg.text,
                    createdAt: msg.created_at,
                });
            }
        }
        res.status(200).json(conversations);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const editMessage = async (req, res) => {
    const { messageId } = req.params;
    const { text, requesterId } = req.body || {};
    try {
        const io = req.app.get('io');
        if (!text || !text.trim()) {
            return res.status(400).json({ error: 'Message text is required' });
        }

        const { data: message, error: fetchError } = await supabase
            .from('messages')
            .select('id, sender_id, receiver_id')
            .eq('id', messageId)
            .single();

        if (fetchError || !message) {
            return res.status(404).json({ error: 'Message not found' });
        }
        if (requesterId && message.sender_id !== requesterId) {
            return res.status(403).json({ error: 'You can only edit your own messages' });
        }

        const { error } = await supabase
            .from('messages')
            .update({ text: text.trim() })
            .eq('id', messageId);
        if (error) throw error;

        // Re-fetch to return a stable object even if update payload is empty.
        const { data: updatedMessage, error: refetchError } = await supabase
            .from('messages')
            .select('*')
            .eq('id', messageId)
            .single();
        if (refetchError || !updatedMessage) {
            return res.status(404).json({ error: 'Message not found after update' });
        }
        if (io) {
            io.to(message.sender_id).emit('message_edited', updatedMessage);
            io.to(message.receiver_id).emit('message_edited', updatedMessage);
        }
        res.status(200).json(updatedMessage);
    } catch (error) { 
        res.status(400).json({ error: error.message }); 
    }
};

// Make sure to add them to module.exports!
// module.exports = { ..., getConversations, editMessage };
// Add to module.exports
module.exports = { getUsers, getMessages, deleteMessage, deleteConversation, getConversations, editMessage};