const supabase = require('../config/supabaseClient');

const getDashboardStats = async (req, res) => {
    try {
        const [
            { count: usersCount },
            { count: petsCount },
            { count: adoptionsCount },
            // [ADMIN] count ALL L&F reports — status field may be null for reports without explicit status set
            { count: totalReportsCount },
        ] = await Promise.all([
            supabase.from('users').select('*', { count: 'exact', head: true }),
            supabase.from('pets').select('*', { count: 'exact', head: true }),
            supabase.from('pets').select('*', { count: 'exact', head: true }).eq('status', 'adopted'),
            supabase.from('lost_and_found').select('*', { count: 'exact', head: true }),
        ]);

        res.status(200).json({
            users: usersCount || 0,
            activePets: petsCount || 0,
            successfulAdoptions: adoptionsCount || 0,
            activeReports: totalReportsCount || 0,
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

        // [ANNOUNCEMENTS] push to every user that has a registered push token
        try {
            const { sendPushToTokens } = require('../utils/pushNotifier');
            const { data: users } = await supabase.from('users')
                .select('expo_push_token')
                .not('expo_push_token', 'is', null);
            const tokens = (users || []).map(u => u.expo_push_token).filter(Boolean);
            await sendPushToTokens(tokens, {
                title,
                body: content.length > 100 ? content.slice(0, 100) + '…' : content,
                data: { type: 'announcement', announcementId: data[0].id, title, body: content },
            });
        } catch (pushErr) {
            console.warn('[ANNOUNCEMENTS] push skipped:', pushErr.message);
        }

        res.status(201).json(data[0]);
    } catch (error) { res.status(400).json({ error: error.message }); }
};

// [ADMIN-ANNOUNCE-EDIT] update title/content of an existing announcement
const updateAnnouncement = async (req, res) => {
    const { id } = req.params;
    const { title, content } = req.body;
    try {
        const { data, error } = await supabase.from('announcements')
            .update({ title, content })
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        res.status(200).json(data);
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

// --- PET LISTINGS MANAGEMENT ---
// [ADMIN-PETS] returns ALL pets regardless of status (user-facing getAllPets filters to 'available' only)
const getAllAdminPets = async (req, res) => {
    try {
        const { data, error } = await supabase.from('pets')
            .select('*, owner:users(full_name, avatar_url, email)')
            .order('created_at', { ascending: false });
        if (error) throw error;
        res.status(200).json(data);
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

// --- USER MANAGEMENT ---
const getAllUsers = async (req, res) => {
    try {
        const { data, error } = await supabase.from('users')
            .select('id, full_name, email, avatar_url, created_at')
            .order('created_at', { ascending: false });
        if (error) throw error;
        res.status(200).json(data);
    } catch (error) { res.status(400).json({ error: error.message }); }
};

const deleteUser = async (req, res) => {
    const { userId } = req.params;
    try {
        const { error } = await supabase.from('users').delete().eq('id', userId);
        if (error) throw error;
        res.status(200).json({ message: 'User deleted' });
    } catch (error) { res.status(400).json({ error: error.message }); }
};

// --- LOST & FOUND MODERATION ---
const getAllLostFoundReports = async (req, res) => {
    try {
        const { data, error } = await supabase.from('lost_and_found')
            .select('*, owner:users(full_name, avatar_url, email)')
            .order('created_at', { ascending: false });
        if (error) throw error;
        res.status(200).json(data);
    } catch (error) { res.status(400).json({ error: error.message }); }
};

const deleteLostFoundReport = async (req, res) => {
    const { id } = req.params;
    try {
        const { error } = await supabase.from('lost_and_found').delete().eq('id', id);
        if (error) throw error;
        res.status(200).json({ message: 'Report deleted' });
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
module.exports = { getDashboardStats, getAnnouncements, createAnnouncement, updateAnnouncement, deleteAnnouncement, getAllAdminPets, getAllSystemPosts, deleteSystemPost, getActivityLogs, getAllUsers, deleteUser, getAllLostFoundReports, deleteLostFoundReport };