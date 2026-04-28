// [SAVED-PETS] controller for the saved_pets table
const supabase = require('../config/supabaseClient');

// Idempotent: re-saving an already-saved pet returns 200 instead of 409
const savePet = async (req, res) => {
    const { user_id, pet_id } = req.body;
    if (!user_id || !pet_id) return res.status(400).json({ error: 'user_id and pet_id required' });
    try {
        const { error } = await supabase
            .from('saved_pets')
            .insert([{ user_id, pet_id }]);
        // 23505 is unique_violation; treat as success (idempotent)
        if (error && error.code !== '23505') throw error;
        res.status(200).json({ message: 'Saved' });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const getSavedPets = async (req, res) => {
    const { userId } = req.params;
    try {
        // join with pets table so the response shape matches getAllPets
        const { data, error } = await supabase
            .from('saved_pets')
            .select('created_at, pet:pets(*, owner:users(full_name, avatar_url, email))')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });
        if (error) throw error;
        // unwrap the join: caller expects an array of pet records
        const pets = (data || []).map(row => row.pet).filter(Boolean);
        res.status(200).json(pets);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Idempotent: deleting a non-existent saved row still returns 200
const unsavePet = async (req, res) => {
    const { userId, petId } = req.params;
    try {
        const { error } = await supabase
            .from('saved_pets')
            .delete()
            .eq('user_id', userId)
            .eq('pet_id', petId);
        if (error) throw error;
        res.status(200).json({ message: 'Unsaved' });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

module.exports = { savePet, getSavedPets, unsavePet };
