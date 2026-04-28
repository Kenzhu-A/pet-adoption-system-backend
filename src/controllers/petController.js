const supabase = require('../config/supabaseClient');

const createPetPost = async (req, res) => {
    const { 
        owner_id, category, pet_name, breed, age, location, description, image_url, 
        medical_history, behavior, personality, price 
    } = req.body;
    
    try {
        const { data, error } = await supabase
            .from('pets')
            .insert([{ 
                owner_id, category, pet_name, breed, age, location, description, image_url,
                medical_history, behavior, personality, price 
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
        const { data, error } = await supabase.from('pets').select('*, owner:users(full_name, avatar_url, email)').eq('status', 'available').order('created_at', { ascending: false });
        if (error) throw error;
        res.status(200).json(data);
    } catch (error) { res.status(400).json({ error: error.message }); }
};

// --- NEW FEATURES ---

const getMyPets = async (req, res) => {
    const { userId } = req.params;
    try {
        const { data, error } = await supabase.from('pets').select('*').eq('owner_id', userId).order('created_at', { ascending: false });
        if (error) throw error;
        res.status(200).json(data);
    } catch (error) { res.status(400).json({ error: error.message }); }
};

const updatePetStatus = async (req, res) => {
    const { petId, status } = req.body;
    try {
        const { data, error } = await supabase.from('pets').update({ status }).eq('id', petId).select();
        if (error) throw error;
        res.status(200).json(data[0]);
    } catch (error) { res.status(400).json({ error: error.message }); }
};

const uploadPetImage = async (req, res) => {
    try {
        const file = req.file;
        if (!file) return res.status(400).json({ error: 'No image provided' });
        
        const fileExt = file.originalname.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        
        // Target the 'pets' bucket
        const { error: uploadError } = await supabase.storage.from('pets').upload(fileName, file.buffer, { contentType: file.mimetype });
        if (uploadError) throw uploadError;
        
        const { data: publicUrlData } = supabase.storage.from('pets').getPublicUrl(fileName);
        res.status(200).json({ image_url: publicUrlData.publicUrl });
    } catch (error) { res.status(500).json({ error: error.message }); }
};
const deletePetPost = async (req, res) => {
    const { petId } = req.params;
    try {
        const { error } = await supabase.from('pets').delete().eq('id', petId);
        if (error) throw error;
        res.status(200).json({ message: 'Pet post deleted' });
    } catch (error) { res.status(400).json({ error: error.message }); }
};
const getPetById = async (req, res) => {
    const { petId } = req.params;
    try {
        const { data, error } = await supabase
            .from('pets')
            .select('*, owner:users(id, full_name, avatar_url, email)')
            .eq('id', petId)
            .single();
            
        if (error) throw error;
        res.status(200).json(data);
    } catch (error) { 
        res.status(400).json({ error: error.message }); 
    }
};
module.exports = { createPetPost, getAllPets, getMyPets, updatePetStatus, uploadPetImage, deletePetPost, getPetById };