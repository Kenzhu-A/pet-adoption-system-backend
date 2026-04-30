// [REPORTS] user-submitted content reports — pet posts and community posts
// Required Supabase table:
//   reports (id uuid pk default gen_random_uuid(),
//            report_type text,   -- 'pet_post' | 'community_post'
//            item_id     text,   -- id of the reported pet or post
//            reporter_id uuid references users(id),
//            reason      text,
//            description text,
//            status      text default 'pending',
//            created_at  timestamptz default now())
const supabase = require('../config/supabaseClient');

// POST /api/reports  — submit a new report
const createReport = async (req, res) => {
    const { report_type, item_id, reporter_id, reason, description } = req.body;
    if (!report_type || !item_id || !reporter_id || !reason) {
        return res.status(400).json({ error: 'Missing required fields.' });
    }
    try {
        // only include optional fields when they have a value — avoids PostgREST
        // schema-cache errors if the column doesn't exist or cache is stale
        const payload = { report_type, item_id, reporter_id, reason };
        if (description) payload.description = description;

        const { data, error } = await supabase.from('reports')
            .insert([payload])
            .select()
            .single();
        if (error) throw error;
        res.status(201).json(data);
    } catch (error) { res.status(400).json({ error: error.message }); }
};

// GET /api/reports  — admin: all reports with reporter info (manual join, no FK required)
const getAllReports = async (req, res) => {
    try {
        const { data: reports, error } = await supabase.from('reports')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) throw error;

        // collect unique reporter IDs and fetch user rows in one query
        const ids = [...new Set((reports || []).map(r => r.reporter_id).filter(Boolean))];
        let userMap = {};
        if (ids.length > 0) {
            const { data: users } = await supabase.from('users')
                .select('id, full_name, avatar_url, email')
                .in('id', ids);
            (users || []).forEach(u => { userMap[u.id] = u; });
        }

        const enriched = (reports || []).map(r => ({ ...r, reporter: userMap[r.reporter_id] || null }));
        res.status(200).json(enriched);
    } catch (error) { res.status(400).json({ error: error.message }); }
};

// DELETE /api/reports/:id  — admin: dismiss report (remove report record only)
const dismissReport = async (req, res) => {
    const { id } = req.params;
    try {
        const { error } = await supabase.from('reports').delete().eq('id', id);
        if (error) throw error;
        res.status(200).json({ message: 'Report dismissed.' });
    } catch (error) { res.status(400).json({ error: error.message }); }
};

// DELETE /api/reports/:id/content  — admin: delete the actual post/pet AND the report
const deleteReportedContent = async (req, res) => {
    const { id } = req.params;
    try {
        // fetch report to know what to delete
        const { data: report, error: fetchErr } = await supabase
            .from('reports').select('*').eq('id', id).single();
        if (fetchErr) throw fetchErr;

        // delete the actual content
        if (report.report_type === 'pet_post') {
            await supabase.from('pets').delete().eq('id', report.item_id);
        } else if (report.report_type === 'community_post') {
            await supabase.from('general_posts').delete().eq('id', report.item_id);
        }

        // delete the report itself
        await supabase.from('reports').delete().eq('id', id);

        res.status(200).json({ message: 'Content and report deleted.' });
    } catch (error) { res.status(400).json({ error: error.message }); }
};

module.exports = { createReport, getAllReports, dismissReport, deleteReportedContent };
