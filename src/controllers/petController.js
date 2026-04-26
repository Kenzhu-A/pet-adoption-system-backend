const supabase = require('../config/supabaseClient');

const createPetPost = async (req, res) => {
    // 1. Destructure the new fields from the request body
    const { 
        owner_id, pet_name, breed, age, location, description, image_url, 
        medical_history, behavior, personality 
    } = req.body;
    
    try {
        // 2. Insert them into the Supabase database
        const { data, error } = await supabase
            .from('pets')
            .insert([{ 
                owner_id, pet_name, breed, age, location, description, image_url,
                medical_history, behavior, personality 
            }])
            .select();

        if (error) throw error;
        res.status(201).json({ message: 'Pet post created successfully', pet: data[0] });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const getAllPets = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('pets')
            .select('*, owner:users(full_name, avatar_url)')
            .eq('status', 'available')
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.status(200).json(data);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

module.exports = { createPetPost, getAllPets };