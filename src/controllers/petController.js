const supabase = require('../config/supabaseClient');

const createPetPost = async (req, res) => {
    const { owner_id, pet_name, breed, age, location, description, image_url } = req.body;
    try {
        const { data, error } = await supabase
            .from('pets')
            .insert([{ owner_id, pet_name, breed, age, location, description, image_url }])
            .select();

        if (error) throw error;
        res.status(201).json({ message: 'Pet post created successfully', pet: data[0] });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const getAllPets = async (req, res) => {
    try {
        // Fetch pets and join with the owner's details
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