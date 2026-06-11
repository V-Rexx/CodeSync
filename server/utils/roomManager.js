const Room = require('../models/Room');

const rooms = new Map();

const SAVE_EVERY_N_VERSIONS = 10;

const getOrCreateRoom = async (roomId) => {
    if(!rooms.has(roomId)){
        const dbRoom = await Room.findById(roomId);
        if(!dbRoom) return null;
        rooms.set(roomId, {
            code: dbRoom.code,
            version: dbRoom.version,
            language: dbRoom.language,
            users: new Map(),
            messages: [],
            lastSavedVersion: dbRoom.version,
        });
    }
    return rooms.get(roomId);
};

const addUser = (roomId, userId, userData) => {
    const room = rooms.get(roomId);
    if(!room) return;
    room.users.set(userId, userData);
};

const removeUser = (roomId, userId) => {
    const room = rooms.get(roomId);
    if(!room) return false;
    room.users.delete(userId);
    return room.users.size === 0;
};

const updateCode = (roomId, code) => {
    const room = rooms.get(roomId);
    if(!room) return null;
    room.code = code;
    room.version += 1;
    return room.version;
};

const updateLanguage = (roomId, language) => {
    const room = rooms.get(roomId);
    if(room) room.language = language;
};

const getUsers = (roomId) => {
  const room = rooms.get(roomId);
  if (!room) return [];
  return Array.from(room.users.values());
};

const shouldAutoSave = (roomId) => {
  const room = rooms.get(roomId);
  if (!room) return false;
  return room.version - room.lastSavedVersion >= SAVE_EVERY_N_VERSIONS;
};

const saveToDb = async (roomId) => {
  const room = rooms.get(roomId);
  if (!room) return;
  if (room.version === room.lastSavedVersion) return;
  await Room.findByIdAndUpdate(roomId, {
    code: room.code,
    version: room.version,
    language: room.language,
  });
  room.lastSavedVersion = room.version;
};

const cleanupRoom = (roomId) => {
  rooms.delete(roomId);
};

const MAX_MESSAGES = 50;

const addMessage = (roomId, message) => {
  const room = rooms.get(roomId);
  if(!room) return;
  room.messages.push(message);
  if(room.messages.length > MAX_MESSAGES){
    room.messages.shift();
  }
};

const getMessages = (roomId) => {
  const room = rooms.get(roomId);
  return room?.messages || [];
};

module.exports = {
  getOrCreateRoom,
  addUser,
  removeUser,
  updateCode,
  updateLanguage,
  getUsers,
  shouldAutoSave,
  saveToDb,
  cleanupRoom,
  addMessage,
  getMessages
};