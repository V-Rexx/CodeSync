const express = require('express');
const http = require('http');
const dotenv = require('dotenv');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const {Server} = require('socket.io')
const roomManager = require('./utils/roomManager');
const User = require('./models/User');

const connectDB = require('./config/db');
const authRoutes = require('./routes/auth.routes');
const roomRoutes = require('./routes/room.routes');
const socketAuth = require('./middleware/socket.middleware');

dotenv.config();

connectDB();

const app = express();
const server = http.createServer(app);

app.use(express.json());
app.use(cookieParser());

const allowedOrigins = [
    process.env.CLIENT_URL,
    'http://localhost:5173',
    'http://127.0.0.1:5500',
    'http://localhost:5500',
].filter(Boolean);

app.use(cors({
    origin: allowedOrigins,
    credentials: true
}));

app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.get('/api/health', (req, res) => {
    res.json({status: 'ok', message: 'CodeSync server is running'});
});

const io = new Server(server, {
    cors: {
        origin: allowedOrigins,
        credentials: true,
    }
});

io.use(socketAuth);

io.on('connection', (socket) => {                   
  const userId = socket.data.user.id;
  let username = 'User';                              
  const joinedRooms = new Set();

  console.log(`Connected: ${userId}`);

  socket.on('join-room', async (roomId) => {
    console.log(`[1] join-room received from ${username} (${userId}) for ${roomId}`);
    try {
      const room = await roomManager.getOrCreateRoom(roomId);
      if (!room) {
        socket.emit('error', { message: 'Room not found' });
        return;
      }

      socket.join(roomId);
      joinedRooms.add(roomId);

      roomManager.addUser(roomId, userId, {
        userId,
        username,
        socketId: socket.id,
      });

      const socketsInRoom = await io.in(roomId).fetchSockets();
      console.log(`${username} joined room ${roomId}. Sockets in room: ${socketsInRoom.length}`);

      socket.emit('room-state', {
        code: room.code,
        version: room.version,
        language: room.language,
        users: roomManager.getUsers(roomId),
        messages: roomManager.getMessages(roomId),
      });

      socket.to(roomId).emit('user-joined', { userId, username });
      io.to(roomId).emit('users-update', roomManager.getUsers(roomId));
    } catch (err) {
      console.error('Error in join-room:', err);
    }
  });

  socket.on('code-change', async ({ roomId, code, version }) => {
    console.log(`code-change from ${username}, version ${version}`);

    const room = await roomManager.getOrCreateRoom(roomId);
    if (!room) return;

    if (version < room.version) {
      console.log(`version mismatch (client ${version}, server ${room.version}) — resyncing ${username}`);
      socket.emit('room-state', {
        code: room.code,
        version: room.version,
        language: room.language,
        users: roomManager.getUsers(roomId),
      });
      return;
    }

    const newVersion = roomManager.updateCode(roomId, code);
    const socketsInRoom = await io.in(roomId).fetchSockets();
    console.log(`broadcasting code-update to room ${roomId}, version ${newVersion}. Sockets in room: ${socketsInRoom.length}`);
    socket.to(roomId).emit('code-update', { code, version: newVersion });

    if (roomManager.shouldAutoSave(roomId)) {
      await roomManager.saveToDb(roomId);
    }
  });

  socket.on('cursor-move', ({ roomId, cursor }) => {
    socket.to(roomId).emit('cursor-update', { userId, username, cursor });
  });

  socket.on('language-change', ({ roomId, language }) => {
    roomManager.updateLanguage(roomId, language);
    io.to(roomId).emit('language-update', { language });
  });

  socket.on('disconnect', async () => {
    console.log(`Disconnected: ${username}`);
    for (const roomId of joinedRooms) {
      const isEmpty = roomManager.removeUser(roomId, userId);
      socket.to(roomId).emit('user-left', { userId, username });
      io.to(roomId).emit('users-update', roomManager.getUsers(roomId));
      if (isEmpty) {
        await roomManager.saveToDb(roomId);
        roomManager.cleanupRoom(roomId);
      }
    }
  });

  socket.on('chat-message', ({ roomId, text }) => {
    console.log(`chat-message received from ${username}: "${text}" for room ${roomId}`);
    if (!text || !text.trim()) return;
    const message = {
      id: `${Date.now()}-${Math.random()}`,
      userId,
      username,
      text: text.trim(),
      timestamp: new Date().toISOString(),
    };
    roomManager.addMessage(roomId, message);
    console.log(`broadcasting chat-message to room ${roomId}`);
    io.to(roomId).emit('chat-message', message);    
  });

  socket.on('typing', ({ roomId }) => {
    socket.to(roomId).emit('user-typing', { userId, username });
  });

  socket.on('stop-typing', ({ roomId }) => {
    socket.to(roomId).emit('user-stop-typing', { userId });
  });

  User.findById(userId)
    .select('username')
    .then((dbUser) => {
      username = dbUser?.username || 'Anonymous';
      socket.data.user.username = username;
    })
    .catch((err) => console.error('Failed to fetch username:', err));
});



const PORT = process.env.PORT

server.listen(PORT, () => {
    console.log(`Server running on PORT: ${PORT}`);
});