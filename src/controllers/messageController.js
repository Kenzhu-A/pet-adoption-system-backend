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

module.exports = { getUsers, getMessages };