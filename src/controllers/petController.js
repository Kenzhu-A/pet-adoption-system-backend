const supabase = require('../config/supabaseClient');
const { sendPushToTokens } = require('../utils/pushNotifier'); // [PUSH-NOTIF]

const createPetPost = async (req, res) => {
    const {
        owner_id, category, pet_name, breed, age, location, description, image_url,
        medical_history, behavior, personality, price,
        gender, weight_kg, size, image_urls, tags  // [DASHBOARD-REDESIGN] new fields
    } = req.body;

    try {
        const { data, error } = await supabase
            .from('pets')
            .insert([{
                owner_id, category, pet_name, breed, age, location, description, image_url,
                medical_history, behavior, personality, price,
                gender, weight_kg, size, image_urls, tags  // [DASHBOARD-REDESIGN] new fields
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
        const updatedPet = data[0];

        // [PUSH-NOTIF] notify savers when a pet is adopted
        if (status === 'adopted' && updatedPet) {
            try {
                const { data: savers } = await supabase
                    .from('saved_pets')
                    .select('user:users(id, expo_push_token)')
                    .eq('pet_id', petId);
                const tokens = (savers || [])
                    .map(r => r.user)
                    .filter(u => u && u.id !== updatedPet.owner_id)
                    .map(u => u.expo_push_token);
                await sendPushToTokens(tokens, {
                    title: 'A saved pet found a home!',
                    body: `${updatedPet.pet_name} has been adopted. Tap to see other pets.`,
                    data: { type: 'pet_adopted', petId },
                });
            } catch (notifyErr) {
                console.error('[PUSH-NOTIF] adopted-push failed:', notifyErr.message);
            }
        }

        res.status(200).json(updatedPet);
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

// [PET-EDIT] full-record update; mirrors createPetPost but on UPDATE not INSERT
const updatePetPost = async (req, res) => {
    const { petId } = req.params;
    const {
        category, pet_name, breed, age, location, description, image_url,
        medical_history, behavior, personality, price,
        gender, weight_kg, size, image_urls, tags
    } = req.body;
    // owner_id intentionally NOT updatable
    try {
        const { data, error } = await supabase
            .from('pets')
            .update({
                category, pet_name, breed, age, location, description, image_url,
                medical_history, behavior, personality, price,
                gender, weight_kg, size, image_urls, tags
            })
            .eq('id', petId)
            .select();

        if (error) throw error;
        if (!data || data.length === 0) return res.status(404).json({ error: 'Pet not found' });
        res.status(200).json(data[0]);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// [LIKED-POSTS] increment or decrement likes_count on a pet, mirrors updateLikeCount for posts
const likePet = async (req, res) => {
    const { petId } = req.params;
    const { increment } = req.body;
    try {
        const { data: current, error: fetchErr } = await supabase
            .from('pets').select('likes_count').eq('id', petId).single();
        if (fetchErr) throw fetchErr;
        const newCount = Math.max(0, (current.likes_count || 0) + (increment ? 1 : -1));
        const { error } = await supabase.from('pets').update({ likes_count: newCount }).eq('id', petId);
        if (error) throw error;
        res.status(200).json({ likes_count: newCount });
    } catch (error) { res.status(400).json({ error: error.message }); }
};

module.exports = { createPetPost, getAllPets, getMyPets, updatePetStatus, uploadPetImage, deletePetPost, getPetById, updatePetPost, likePet };
