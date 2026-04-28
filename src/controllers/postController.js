const supabase = require('../config/supabaseClient');

const createGeneralPost = async (req, res) => {
    const { owner_id, description, image_url } = req.body;
    try {
        const { data, error } = await supabase.from('general_posts').insert([{ owner_id, description, image_url }]).select();
        if (error) throw error;
        res.status(201).json({ message: 'General post created successfully', post: data[0] });
    } catch (error) { res.status(400).json({ error: error.message }); }
};

const getGeneralPosts = async (req, res) => {
    try {
        const { data, error } = await supabase.from('general_posts').select('*, owner:users(full_name, avatar_url)').order('created_at', { ascending: false });
        if (error) throw error;
        res.status(200).json(data);
    } catch (error) { res.status(400).json({ error: error.message }); }
};

const uploadPostImage = async (req, res) => {
    try {
        const file = req.file;
        if (!file) return res.status(400).json({ error: 'No image provided' });
        const fileExt = file.originalname.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('general_posts').upload(fileName, file.buffer, { contentType: file.mimetype });
        if (uploadError) throw uploadError;
        const { data: publicUrlData } = supabase.storage.from('general_posts').getPublicUrl(fileName);
        res.status(200).json({ image_url: publicUrlData.publicUrl });
    } catch (error) { res.status(500).json({ error: error.message }); }
};

// --- NEW: LIKES & COMMENTS ---
const updateLike = async (req, res) => {
    const { postId, increment } = req.body;
    try {
        const { data: post, error: fetchError } = await supabase.from('general_posts').select('likes_count').eq('id', postId).single();
        if (fetchError) throw fetchError;
        
        const newCount = increment ? (post.likes_count + 1) : Math.max(0, post.likes_count - 1);
        const { error: updateError } = await supabase.from('general_posts').update({ likes_count: newCount }).eq('id', postId);
        if (updateError) throw updateError;
        
        res.status(200).json({ likes_count: newCount });
    } catch (error) { res.status(400).json({ error: error.message }); }
};

const getComments = async (req, res) => {
    const { postId } = req.params;
    try {
        const { data, error } = await supabase.from('comments').select('*, user:users(full_name, avatar_url)').eq('post_id', postId).order('created_at', { ascending: true });
        if (error) throw error;
        res.status(200).json(data);
    } catch (error) { res.status(400).json({ error: error.message }); }
};

const addComment = async (req, res) => {
    const { post_id, user_id, text } = req.body;
    try {
        const { data, error } = await supabase.from('comments').insert([{ post_id, user_id, text }]).select('*, user:users(full_name, avatar_url)').single();
        if (error) throw error;
        res.status(201).json(data);
    } catch (error) { res.status(400).json({ error: error.message }); }
};

const deleteGeneralPost = async (req, res) => {
    const { postId } = req.params;
    try {
        const { error } = await supabase.from('general_posts').delete().eq('id', postId);
        if (error) throw error;
        res.status(200).json({ message: 'Post deleted' });
    } catch (error) { res.status(400).json({ error: error.message }); }
};

module.exports = { createGeneralPost, getGeneralPosts, uploadPostImage, updateLike, getComments, addComment, deleteGeneralPost };