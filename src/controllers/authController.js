// src/controllers/authController.js
const supabase = require('../config/supabaseClient');

const register = async (req, res) => {
    const { email, password, full_name } = req.body;
    try {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: { data: { full_name } }
        });
        if (error) throw error;
        res.status(201).json({ message: 'User registered successfully', user: data.user });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
    console.log(`[BACKEND HIT] Registration attempt for email: ${req.body.email}`);
};

const login = async (req, res) => {
    const { email, password } = req.body;
    try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        res.status(200).json({ message: 'Login successful', session: data.session });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const googleLogin = async (req, res) => {
    try {
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: 'snoutscout://auth/callback' // Redirects back to your Expo app
            }
        });
        if (error) throw error;
        
        // Return the Google secure URL to the frontend so it can open the browser
        res.status(200).json({ url: data.url });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

module.exports = { register, login, googleLogin };