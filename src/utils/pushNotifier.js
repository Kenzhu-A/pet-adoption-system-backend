// [PUSH-NOTIF] thin wrapper around Expo's push API — best-effort, never throws
async function sendPushToTokens(tokens, { title, body, data }) {
    const valid = (tokens || []).filter(Boolean);
    if (valid.length === 0) return;
    const messages = valid.map((to) => ({ to, sound: 'default', title, body, data }));
    try {
        await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Accept-encoding': 'gzip, deflate',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(messages),
        });
    } catch (err) {
        console.error('[PUSH-NOTIF] send failed:', err.message);
    }
}

module.exports = { sendPushToTokens };
