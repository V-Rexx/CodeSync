import { useState, useEffect, useRef } from 'react';

const ChatPanel = ({ socket, roomId, currentUserId }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [typingUsers, setTypingUsers] = useState({});
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    if (!socket) return;

    const onChatMessage = (msg) => setMessages((prev) => [...prev, msg]);
    const onRoomState = ({ messages }) => setMessages(messages || []);
    const onTyping = ({ userId, username }) =>
      setTypingUsers((prev) => ({ ...prev, [userId]: username }));
    const onStopTyping = ({ userId }) =>
      setTypingUsers((prev) => {
        const copy = { ...prev };
        delete copy[userId];
        return copy;
      });

    socket.on('chat-message', onChatMessage);
    socket.on('room-state', onRoomState);
    socket.on('user-typing', onTyping);
    socket.on('user-stop-typing', onStopTyping);

    return () => {
      socket.off('chat-message', onChatMessage);
      socket.off('room-state', onRoomState);
      socket.off('user-typing', onTyping);
      socket.off('user-stop-typing', onStopTyping);
    };
  }, [socket]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    socket?.emit('chat-message', { roomId, text: input });
    setInput('');
    socket?.emit('stop-typing', { roomId });
  };

  const handleInput = (e) => {
    setInput(e.target.value);
    socket?.emit('typing', { roomId });

    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket?.emit('stop-typing', { roomId });
    }, 1500);
  };

  const formatTime = (iso) =>
    new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const typingNames = Object.values(typingUsers);

  return (
    <div className="w-80 bg-white border-l border-slate-200 flex flex-col h-full">
      <div className="px-4 py-3 border-b border-slate-200">
        <h3 className="text-sm font-semibold text-slate-900">Chat</h3>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 ? (
          <p className="text-sm text-slate-400 text-center mt-8">
            No messages yet.
          </p>
        ) : (
          messages.map((msg) => {
            const isMine = msg.userId === currentUserId;
            return (
              <div key={msg.id} className={isMine ? 'text-right' : ''}>
                <div className="text-xs mb-1">
                  <span className={`font-medium ${isMine ? 'text-blue-600' : 'text-slate-700'}`}>
                    {msg.username}
                  </span>
                  <span className="text-slate-400 mx-1">·</span>
                  <span className="text-slate-400 font-mono">{formatTime(msg.timestamp)}</span>
                </div>
                <div
                  className={`inline-block px-3 py-2 rounded-lg text-sm max-w-[85%] break-words ${
                    isMine
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-900'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {typingNames.length > 0 && (
        <div className="px-4 py-1 text-xs text-slate-500 italic">
          {typingNames.join(', ')} {typingNames.length === 1 ? 'is' : 'are'} typing…
        </div>
      )}

      <form onSubmit={handleSend} className="border-t border-slate-200 p-3 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={handleInput}
          placeholder="Message…"
          className="flex-1 px-3 py-2 rounded-lg text-sm"
        />
        <button
          type="submit"
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg text-sm transition-colors cursor-pointer"
        >
          Send
        </button>
      </form>
    </div>
  );
};

export default ChatPanel;