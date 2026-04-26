const supabase = require('../config/supabaseClient');

const getUserProfile = async (req, res) => {
    try {
        const { id } = req.params;
        const { data, error } = await supabase.from('users').select('*').eq('id', id).single();
        if (error) throw error;
        res.status(200).json(data);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const uploadAvatar = async (req, res) => {
    try {
        const file = req.file;
        const { userId } = req.body;
        
        if (!file) return res.status(400).json({ error: 'No image provided' });

        // Create a unique filename: user_id + timestamp + extension
        const fileExt = file.originalname.split('.').pop();
        const fileName = `${userId}_${Date.now()}.${fileExt}`;

        // 1. Upload to Supabase Storage 'avatars' bucket
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(fileName, file.buffer, {
                contentType: file.mimetype,
                upsert: true
            });

        if (uploadError) throw uploadError;

        // 2. Get the public URL of the uploaded image
        const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(fileName);
        const avatarUrl = publicUrlData.publicUrl;

        // 3. Update the public.users table with the new URL
        const { error: updateError } = await supabase
            .from('users')
            .update({ avatar_url: avatarUrl })
            .eq('id', userId);

        if (updateError) throw updateError;

        // Send the new URL back to the frontend
        res.status(200).json({ avatar_url: avatarUrl });
    } catch (error) {
        console.error('[AVATAR UPLOAD ERROR]', error);
        res.status(500).json({ error: error.message });
    }
};

// ... existing getUserProfile and uploadAvatar functions ...

const updateProfile = async (req, res) => {
    const { userId, full_name } = req.body;
    try {
        const { error } = await supabase
            .from('users')
            .update({ full_name: full_name })
            .eq('id', userId);

        if (error) throw error;
        res.status(200).json({ message: "Profile updated successfully" });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const updatePassword = async (req, res) => {
    const { email, newPassword } = req.body;
    try {
        // Supabase requires the admin auth API to safely change a password from a Node.js backend
        const { data, error } = await supabase.auth.admin.updateUserById(
            req.body.userId, 
            { password: newPassword }
        );

        // If you don't have the Service Role Key configured in your supabaseClient, 
        // you can also trigger a password reset email here instead:
        // const { error } = await supabase.auth.resetPasswordForEmail(email);

        if (error) throw error;
        res.status(200).json({ message: "Password updated successfully" });
    } catch (error) {
        console.error('[PASSWORD UPDATE ERROR]', error);
        res.status(400).json({ error: error.message });
    }
};

module.exports = { getUserProfile, uploadAvatar, updateProfile, updatePassword };