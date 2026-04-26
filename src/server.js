require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http'); // NEW: Required for Socket.io
const { Server } = require('socket.io'); // NEW: Import Socket.io
const supabase = require('./config/supabaseClient'); // NEW: For saving messages

const authRoutes = require('./routes/authRoutes');
const messageRoutes = require('./routes/messageRoutes'); // NEW
const petRoutes = require('./routes/petRoutes');
const userRoutes = require('./routes/userRoutes');
const app = express();
const server = http.createServer(app); // NEW: Wrap express

// NEW: Initialize Socket.io Server
const io = new Server(server, {
    cors: { origin: '*' }
});

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/messages', messageRoutes); // NEW
app.use('/api/pets', petRoutes);
app.use('/api/users', userRoutes);
// --- REAL-TIME SOCKET LOGIC ---
io.on('connection', (socket) => {
    console.log(`[SOCKET] User connected: ${socket.id}`);

    // 1. When a user opens the app, they join a "room" named after their User ID
    socket.on('register', (userId) => {
        socket.join(userId);
        console.log(`[SOCKET] User ${userId} is now online and ready to receive messages.`);
    });

    // 2. Listen for outgoing messages
    socket.on('send_message', async (data) => {
        const { sender_id, receiver_id, text } = data;
        
        try {
            // Save to Supabase permanently
            const { data: savedMsg, error } = await supabase
                .from('messages')
                .insert([{ sender_id, receiver_id, text }])
                .select()
                .single();

            if (!error && savedMsg) {
                // Send the message to the receiver's screen instantly
                io.to(receiver_id).emit('receive_message', savedMsg);
                // Send it back to the sender so it appears on their screen too
                socket.emit('receive_message', savedMsg);
            }
        } catch (err) {
            console.error('[SOCKET ERROR]', err);
        }
    });

    socket.on('disconnect', () => {
        console.log(`[SOCKET] User disconnected: ${socket.id}`);
    });
});

const PORT = process.env.PORT || 5000;
// CRITICAL: Change app.listen to server.listen so sockets work!
server.listen(PORT, () => {
    console.log(`Server and Socket.io running on port ${PORT}`);
});