const supabase = require('../config/supabaseClient');

const getDashboardStats = async (req, res) => {
    try {
        const { count: usersCount } = await supabase.from('users').select('*', { count: 'exact', head: true });
        const { count: petsCount } = await supabase.from('pets').select('*', { count: 'exact', head: true });
        const { count: adoptionsCount } = await supabase.from('pets').select('*', { count: 'exact', head: true }).eq('status', 'adopted');
        
        res.status(200).json({ 
            users: usersCount || 0, 
            activePets: petsCount || 0, 
            successfulAdoptions: adoptionsCount || 0 
        });
    } catch (error) { res.status(400).json({ error: error.message }); }
};

const getAnnouncements = async (req, res) => {
    try {
        const { data, error } = await supabase.from('announcements')
            .select('*, author:users(full_name, avatar_url)')
            .order('created_at', { ascending: false });
        if (error) throw error;
        res.status(200).json(data);
    } catch (error) { res.status(400).json({ error: error.message }); }
};

const createAnnouncement = async (req, res) => {
    const { title, content, author_id } = req.body;
    try {
        const { data, error } = await supabase.from('announcements')
            .insert([{ title, content, author_id }]).select();
        if (error) throw error;
        res.status(201).json(data[0]);
    } catch (error) { res.status(400).json({ error: error.message }); }
};

const deleteAnnouncement = async (req, res) => {
    const { id } = req.params;
    try {
        const { error } = await supabase.from('announcements').delete().eq('id', id);
        if (error) throw error;
        res.status(200).json({ message: 'Announcement deleted' });
    } catch (error) { res.status(400).json({ error: error.message }); }
};

// --- SYSTEM POSTS MODERATION ---
const getAllSystemPosts = async (req, res) => {
    try {
        const { data, error } = await supabase.from('general_posts')
            .select('*, owner:users(full_name, avatar_url, email)')
            .order('created_at', { ascending: false });
        if (error) throw error;
        res.status(200).json(data);
    } catch (error) { res.status(400).json({ error: error.message }); }
};

const deleteSystemPost = async (req, res) => {
    const { id } = req.params;
    try {
        const { error } = await supabase.from('general_posts').delete().eq('id', id);
        if (error) throw error;
        res.status(200).json({ message: 'Post deleted successfully' });
    } catch (error) { res.status(400).json({ error: error.message }); }
};

// --- ACTIVITY LOGS ---
const getActivityLogs = async (req, res) => {
    try {
        const { data, error } = await supabase.from('activity_logs')
            .select('*, user:users(full_name, email, avatar_url)')
            .order('created_at', { ascending: false })
            .limit(100); // Fetch latest 100 logs
        if (error) throw error;
        res.status(200).json(data);
    } catch (error) { res.status(400).json({ error: error.message }); }
};

// Don't forget to export them at the bottom!
// module.exports = { ..., getAllSystemPosts, deleteSystemPost
module.exports = { getDashboardStats, getAnnouncements, createAnnouncement, deleteAnnouncement, getAllSystemPosts, deleteSystemPost, getActivityLogs };