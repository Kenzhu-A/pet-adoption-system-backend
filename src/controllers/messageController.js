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
        // Fetch all messages where the current user is involved
        const { data, error } = await supabase
            .from('messages')
            .select('*, sender:users!messages_sender_id_fkey(id, full_name, avatar_url, email), receiver:users!messages_receiver_id_fkey(id, full_name, avatar_url, email)')
            .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Group them by unique partner to create a "Conversations" list
        const conversations = [];
        const partnerIds = new Set();

        for (const msg of data) {
            const isSender = msg.sender_id === userId;
            const partnerId = isSender ? msg.receiver_id : msg.sender_id;
            
            if (!partnerIds.has(partnerId)) {
                partnerIds.add(partnerId);
                const partner = isSender ? msg.receiver : msg.sender;
                conversations.push({
                    partnerId,
                    partnerName: partner?.full_name || partner?.email || 'Unknown User',
                    partnerAvatar: partner?.avatar_url,
                    latestMessage: msg.text,
                    createdAt: msg.created_at
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