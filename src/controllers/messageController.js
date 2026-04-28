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
    try {
        const { error } = await supabase.from('messages').delete().eq('id', messageId);
        if (error) throw error;
        res.status(200).json({ message: 'Message deleted' });
    } catch (error) { res.status(400).json({ error: error.message }); }
};

const deleteConversation = async (req, res) => {
    const { user1, user2 } = req.params;
    try {
        const { error } = await supabase.from('messages')
            .delete()
            .or(`and(sender_id.eq.${user1},receiver_id.eq.${user2}),and(sender_id.eq.${user2},receiver_id.eq.${user1})`);
        if (error) throw error;
        res.status(200).json({ message: 'Conversation deleted' });
    } catch (error) { res.status(400).json({ error: error.message }); }
};

const getConversations = async (req, res) => {
    const { userId } = req.params;
    try {
        // [DASHBOARD-REDESIGN] fixed: messages FK points to auth.users not public.users,
        // so we cannot use FK hints. Fetch messages then batch-lookup public.users separately.
        const { data: messages, error } = await supabase
            .from('messages')
            .select('*')
            .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Collect unique partner IDs
        const partnerIds = new Set();
        for (const msg of messages) {
            const partnerId = msg.sender_id === userId ? msg.receiver_id : msg.sender_id;
            partnerIds.add(partnerId);
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
            if (!seen.has(partnerId)) {
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
    const { text } = req.body;
    try {
        const { data, error } = await supabase.from('messages').update({ text }).eq('id', messageId).select();
        if (error) throw error;
        res.status(200).json(data[0]);
    } catch (error) { 
        res.status(400).json({ error: error.message }); 
    }
};

// Make sure to add them to module.exports!
// module.exports = { ..., getConversations, editMessage };
// Add to module.exports
module.exports = { getUsers, getMessages, deleteMessage, deleteConversation, getConversations, editMessage};