// src/controllers/authController.js
const supabase = require('../config/supabaseClient');

const register = async (req, res) => {
    const { email, password, full_name } = req.body;
    
    // 1. Move the log to the very top so you know immediately when the route is hit
    console.log(`[BACKEND HIT] Registration attempt for email: ${email}`);

    try {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: { data: { full_name } }
        });
        
        if (error) throw error;

        // 2. Add the Supabase silent duplicate checker
        if (data.user && data.user.identities && data.user.identities.length === 0) {
            console.error("[BACKEND ERROR] User already exists.");
            return res.status(400).json({ error: "User already exists with this email." });
        }

        console.log(`[BACKEND SUCCESS] User registered: ${data.user.id}`);
        res.status(201).json({ message: 'User registered successfully', user: data.user });
    } catch (error) {
        console.error(`[BACKEND ERROR] ${error.message}`);
        res.status(400).json({ error: error.message });
    }
};

const login = async (req, res) => {
    const { email, password } = req.body;
    console.log(`[BACKEND HIT] Login attempt for email: ${email}`);
    
    try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        
        console.log(`[BACKEND SUCCESS] User logged in: ${data.user.id}`);
        res.status(200).json({ message: 'Login successful', session: data.session });
    } catch (error) {
        console.error(`[BACKEND ERROR] ${error.message}`);
        res.status(400).json({ error: error.message });
    }
};

const googleLogin = async (req, res) => {
    console.log(`[BACKEND HIT] Google Auth initialized`);
    try {
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: 'snoutscout://auth/callback' 
            }
        });
        if (error) throw error;
        
        res.status(200).json({ url: data.url });
    } catch (error) {
        console.error(`[BACKEND ERROR] ${error.message}`);
        res.status(400).json({ error: error.message });
    }
};

module.exports = { register, login, googleLogin };