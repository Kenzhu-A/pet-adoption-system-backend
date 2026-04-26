const supabase = require('../config/supabaseClient');

const register = async (req, res) => {
    const { email, password, full_name } = req.body;
    try {
        const { data: existingUser } = await supabase.from('users').select('*').eq('email', email).single();
        if (existingUser) return res.status(400).json({ error: 'Email already exists' });

        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;

        const userId = data.user.id;
        const { error: dbError } = await supabase.from('users').insert([{ id: userId, email, full_name }]);
        if (dbError) throw dbError;

        res.status(201).json({ message: 'User registered successfully', user: data.user });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

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

module.exports = { register, login, forgotPassword, verifyOtp };