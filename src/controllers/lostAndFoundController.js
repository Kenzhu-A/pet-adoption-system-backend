const supabase = require('../config/supabaseClient');

const createReport = async (req, res) => {
    const { owner_id, report_type, pet_category, pet_name, description, location, contact_info, image_url } = req.body;
    try {
        const { data, error } = await supabase.from('lost_and_found').insert([{ 
            owner_id, report_type, pet_category, pet_name, description, location, contact_info, image_url 
        }]).select();
        if (error) throw error;
        res.status(201).json({ message: 'Report created successfully', report: data[0] });
    } catch (error) { res.status(400).json({ error: error.message }); }
};

const getReports = async (req, res) => {
    try {
        const { data, error } = await supabase.from('lost_and_found')
            .select('*, owner:users(full_name, avatar_url)')
            .eq('status', 'Active')
            .order('created_at', { ascending: false });
        if (error) throw error;
        res.status(200).json(data);
    } catch (error) { res.status(400).json({ error: error.message }); }
};

const uploadReportImage = async (req, res) => {
    try {
        const file = req.file;
        if (!file) return res.status(400).json({ error: 'No image provided' });
        const fileExt = file.originalname.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage.from('lost_and_found').upload(fileName, file.buffer, { contentType: file.mimetype });
        if (uploadError) throw uploadError;
        
        const { data: publicUrlData } = supabase.storage.from('lost_and_found').getPublicUrl(fileName);
        res.status(200).json({ image_url: publicUrlData.publicUrl });
    } catch (error) { res.status(500).json({ error: error.message }); }
};

// [LOST-FOUND] edit an existing report (owner only, enforced on frontend)
const updateReport = async (req, res) => {
    const { reportId } = req.params;
    const { report_type, pet_category, pet_name, description, location, contact_info, image_url } = req.body;
    try {
        const { data, error } = await supabase.from('lost_and_found')
            .update({ report_type, pet_category, pet_name, description, location, contact_info, image_url })
            .eq('id', reportId)
            .select();
        if (error) throw error;
        res.status(200).json(data[0]);
    } catch (error) { res.status(400).json({ error: error.message }); }
};

const resolveReport = async (req, res) => {
    const { reportId } = req.params;
    try {
        const { error } = await supabase.from('lost_and_found').update({ status: 'Resolved' }).eq('id', reportId);
        if (error) throw error;
        res.status(200).json({ message: 'Report resolved' });
    } catch (error) { res.status(400).json({ error: error.message }); }
};

module.exports = { createReport, updateReport, getReports, uploadReportImage, resolveReport };