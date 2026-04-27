const supabase = require('../config/supabaseClient');

const register = async (req, res) => {
    const { email, password, full_name } = req.body;
    try {
        // 1. Check if they already exist in our public table
        const { data: existingUser } = await supabase.from('users').select('*').eq('email', email).single();
        if (existingUser) return res.status(400).json({ error: 'Email already exists' });

        // 2. Create the account in Supabase Auth
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;

        const userId = data.user.id;

        // 3. THE FIX: Use upsert() instead of insert(). 
        // This safely merges the data without throwing a Duplicate Key error!
        const { error: dbError } = await supabase
            .from('users')
            .upsert([{ id: userId, email, full_name }]);
            
        if (dbError) throw dbError;

        res.status(201).json({ message: 'User registered successfully', user: data.user });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
}
const login = async (req, res) => {
    const { email, password } = req.body;
    try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;

        const { data: userData } = await supabase.from('users').select('*').eq('id', data.user.id).single();

        res.status(200).json({ message: 'Login successful', user: userData, session: data.session });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const forgotPassword = async (req, res) => {
    const { email } = req.body;
    try {
        if (!email) throw new Error("Email is required");
        const { error } = await supabase.auth.resetPasswordForEmail(email);
        if (error) throw error;
        res.status(200).json({ message: "OTP sent to email successfully" });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const verifyOtp = async (req, res) => {
    const { email, otp } = req.body;
    try {
        if (!email || !otp) {
            return res.status(400).json({ error: "Email and OTP are required" });
        }

        const { data, error } = await supabase.auth.verifyOtp({
            email: email,
            token: otp,
            type: 'recovery'
        });
        
        if (error) throw error;
        
        res.status(200).json({ 
            message: "OTP verified", 
            userId: data?.user?.id || '' 
        });
    } catch (error) {
        // Ensures we always send a clean string back to the frontend
        res.status(400).json({ error: error.message || "Invalid or expired OTP" });
    }
};

const getGoogleAuthUrl = async (req, res) => {
    try {
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                // Explicitly tell Supabase to redirect back to the Expo app!
                redirectTo: 'snoutscout://auth/callback'
            }
        });
        
        if (error) throw error;
        
        res.status(200).json({ url: data.url });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// --- NEW: VERIFY GOOGLE TOKEN ---
const verifyGoogleToken = async (req, res) => {
    const { access_token } = req.body;
    try {
        // 1. Ask Supabase to decrypt the token and give us the user data
        const { data, error } = await supabase.auth.getUser(access_token);
        if (error) throw error;

        const userId = data.user.id;
        const email = data.user.email;
        
        // Extract their Google name, or default to the first part of their email
        const full_name = data.user.user_metadata?.full_name || email.split('@')[0];

        // 2. Ensure they exist in your public.users table!
        const { error: dbError } = await supabase
            .from('users')
            .upsert([{ id: userId, email, full_name }]);
            
        if (dbError) throw dbError;

        // 3. Send the secure ID back to the mobile app
        res.status(200).json({ userId });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Make sure to add it to your exports!
module.exports = { register, login, forgotPassword, verifyOtp, getGoogleAuthUrl, verifyGoogleToken };