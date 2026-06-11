import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import ConfirmModal from '../components/ConfirmModal';
import csLogo from '../src/assets/cs-logo.png';

const Dashboard = () => {
  const [rooms, setRooms] = useState([]);
  const [newRoomName, setNewRoomName] = useState('');
  const [joinRoomId, setJoinRoomId] = useState('');
  const [error, setError] = useState('');
  const [roomToDelete, setRoomToDelete] = useState(null);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => { fetchRooms(); }, []);

  const fetchRooms = async () => {
    try {
      const { data } = await api.get('/rooms');
      setRooms(data);
    } catch (err) {
      setError('Failed to load rooms');
    }
  };

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    if (!newRoomName.trim()) return;
    try {
      const { data } = await api.post('/rooms', { name: newRoomName });
      setNewRoomName('');
      setRooms([data, ...rooms]);
      navigate(`/room/${data._id}`);
    } catch (err) {
      setError('Failed to create room');
    }
  };

  const handleJoinRoom = (e) => {
    e.preventDefault();
    if (!joinRoomId.trim()) return;
    navigate(`/room/${joinRoomId.trim()}`);
  };

  const handleDeleteRoom = async () => {
    const roomId = roomToDelete;
    setRoomToDelete(null);
    try {
      await api.delete(`/rooms/${roomId}`);
      setRooms(rooms.filter((r) => r._id !== roomId));
    } catch (err) {
      setError('Failed to delete room');
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b border-slate-200 px-6 py-3 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <img src={csLogo} alt="codeSync" className="w-8 h-8 rounded-lg object-contain" />
          <span className="font-semibold text-slate-900">codeSync</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 text-sm font-semibold">
              {user?.username?.[0]?.toUpperCase()}
            </div>
            <span className="text-sm font-medium text-slate-900">{user?.username}</span>
          </div>
          <div className='text-sm text-slate-600 hover:bg-red-50 hover:text-red-600 active:bg-red-650 rounded-2xl p-2 transition-transform duration-100 hover:scale-110 active:scale-95 cursor-pointer'>
            <button
              onClick={handleLogout}
              className="cursor-pointer"
            >
              LogOut
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Welcome back, {user?.username}
          </h1>
          <p className="text-slate-600">Pick up where you left off, or start something new.</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-6">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
          <form
            onSubmit={handleCreateRoom}
            className="bg-white border border-slate-200 rounded-xl p-5"
          >
            <h2 className="text-sm font-semibold text-slate-900 mb-1">Create new room</h2>
            <p className="text-xs text-slate-500 mb-3">Start a fresh coding session.</p>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Room name"
                value={newRoomName}
                onChange={(e) => setNewRoomName(e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg text-sm"
              />
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg text-sm transition-colors cursor-pointer"
              >
                Create
              </button>
            </div>
          </form>

          <form
            onSubmit={handleJoinRoom}
            className="bg-white border border-slate-200 rounded-xl p-5"
          >
            <h2 className="text-sm font-semibold text-slate-900 mb-1">Join existing</h2>
            <p className="text-xs text-slate-500 mb-3">Got a room ID from a teammate?</p>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Paste room ID"
                value={joinRoomId}
                onChange={(e) => setJoinRoomId(e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg text-sm font-mono"
              />
              <button
                type="submit"
                className="bg-slate-900 hover:bg-slate-800 text-white font-medium px-4 py-2 rounded-lg text-sm transition-colors cursor-pointer"
              >
                Join
              </button>
            </div>
          </form>
        </div>

        <div className="flex items-baseline justify-between mb-4">
          <h2 className="text-sm font-semibold text-slate-900">Your rooms</h2>
          <span className="text-xs text-slate-500">
            {rooms.length} {rooms.length === 1 ? 'room' : 'rooms'}
          </span>
        </div>

        {rooms.length === 0 ? (
          <div className="bg-white border border-slate-200 border-dashed rounded-xl p-12 text-center">
            <p className="text-slate-500 text-sm">No rooms yet. Create one above to get started.</p>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden">
            {rooms.map((room) => (
              <div
                key={room._id}
                className="p-4 flex justify-between items-center hover:bg-slate-50 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <h3 className="font-medium text-slate-900 truncate">{room.name}</h3>
                  <p className="text-xs text-slate-500 font-mono truncate mt-0.5">
                    {room._id}
                  </p>
                </div>
                <div className="flex gap-1 ml-4">
                  <button
                    onClick={() => navigate(`/room/${room._id}`)}
                    className="text-sm font-medium text-blue-600 hover:text-blue-700 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors cursor-pointer"
                  >
                    Open
                  </button>
                  <button
                    onClick={() => setRoomToDelete(room._id)}
                    className="text-sm text-slate-500 hover:text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmModal
        open={!!roomToDelete}
        title="Delete room"
        message="Are you sure you want to delete this room? This action cannot be undone."
        confirmText="Delete"
        onConfirm={handleDeleteRoom}
        onCancel={() => setRoomToDelete(null)}
      />
    </div>
  );
};

export default Dashboard;