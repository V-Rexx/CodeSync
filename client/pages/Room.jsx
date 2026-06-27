import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import useSocket from '../hooks/useSocket';
import { useAuth } from '../context/AuthContext';
import ChatPanel from '../components/ChatPanel';

const LANGUAGES = [
  'javascript', 'typescript', 'python', 'cpp',
  'java', 'go', 'rust', 'html', 'css',
];

const CURSOR_COLORS = [
  '#FF6B6B', '#4ECDC4', '#FFE66D', '#A8E6CF',
  '#FF8B94', '#B4A7D6', '#FFB347', '#87CEEB',
];

const getUserColor = (userId) => {
  const hash = String(userId)
    .split('')
    .reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return CURSOR_COLORS[hash % CURSOR_COLORS.length];
};

const Room = () => {
  const { id: roomId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [language, setLanguage] = useState('javascript');
  const [users, setUsers] = useState([]);
  const [connected, setConnected] = useState(false);

  const socket = useSocket();
  const socketRef = useRef(socket);
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const versionRef = useRef(0);
  const decorationsRef = useRef({}); 
  const isApplyingRemote = useRef(false); 


  useEffect(() => {
    socketRef.current = socket;
  }, [socket]);


  const applyCode = (code) => {
    if (!editorRef.current) return;
    if (editorRef.current.getValue() === code) return;
    editorRef.current.setValue(code);
    
  };

  const updateRemoteCursor = (userId, username, cursor) => {
    if (userId === user?.id) return;
    if (!editorRef.current || !monacoRef.current || !cursor) return;

    const color = getUserColor(userId);
    const oldDecorations = decorationsRef.current[userId] || [];

    const newDecorations = editorRef.current.deltaDecorations(oldDecorations, [
      {
        range: new monacoRef.current.Range(
          cursor.lineNumber,
          cursor.column,
          cursor.lineNumber,
          cursor.column
        ),
        options: {
          className: `cursor-${userId}`,
          stickiness: 1,
          hoverMessage: { value: username },
        },
      },
    ]);

    decorationsRef.current[userId] = newDecorations;


    let style = document.getElementById(`cursor-style-${userId}`);
    if (!style) {
      style = document.createElement('style');
      style.id = `cursor-style-${userId}`;
      document.head.appendChild(style);
    }
    style.innerHTML = `
      .cursor-${userId} {
        background: ${color};
        width: 2px !important;
        margin-left: -1px;
      }
    `;
  };

  useEffect(() => {
    if (!socket) return;

    const handleConnect = () => {
      setConnected(true);
      console.log('🔗 Emitting join-room for:', roomId); 
      socket.emit('join-room', roomId);
    };

    const handleDisconnect = () => setConnected(false);

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    if (socket.connected) handleConnect();

    socket.on('room-state', ({ code, version, language, users }) => {
      applyCode(code);
      versionRef.current = version;
      setLanguage(language);
      setUsers(users);
    });

    socket.on('code-update', ({ code, version, sentAt }) => {
      console.log('code-update received', { codeLen: code?.length, version });
      applyCode(code);
      versionRef.current = version;
      if (sendAt){
        (window.__lat ||= []).push(Date.now() - sentAt);
      }
    });

    socket.on('language-update', ({ language }) => {
      setLanguage(language);
    });

    socket.on('users-update', (users) => {
      setUsers(users);
    });

    socket.on('cursor-update', ({ userId, username, cursor }) => {
      updateRemoteCursor(userId, username, cursor);
    });

    socket.on('error', ({ message }) => {
      alert(message);
      navigate('/dashboard');
    });

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('room-state');
      socket.off('code-update');
      socket.off('language-update');
      socket.off('users-update');
      socket.off('cursor-update');
      socket.off('error');
    };
  }, [socket, roomId]);

  
  const handleEditorMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    
    editor.onDidChangeModelContent((e) => {
      if (e.isFlush) return; 
      const value = editor.getValue();
      socketRef.current?.emit('code-change', {
        roomId,
        code: value,
        version: versionRef.current,
        sentAt: Date.now(),
      });
      versionRef.current += 1;
    });

    editor.onDidChangeCursorPosition((e) => {
      socketRef.current?.emit('cursor-move', {
        roomId,
        cursor: {
          lineNumber: e.position.lineNumber,
          column: e.position.column,
        },
      });
    });
  };

  // const handleEditorChange = (value) => {
  //   console.log(' local change', { isApplyingRemote: isApplyingRemote.current, version: versionRef.current });
  //   if (isApplyingRemote.current) return; // ignore remote-applied changes
  //   socket?.emit('code-change', {
  //     roomId,
  //     code: value,
  //     version: versionRef.current,
  //   });
  //   versionRef.current += 1;
  // };

  const handleLanguageChange = (e) => {
    const newLang = e.target.value;
    setLanguage(newLang);
    socket?.emit('language-change', { roomId, language: newLang });
  };

  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId);
  };

  return (
    <div className="h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="border-b border-slate-200 px-4 py-3 flex justify-between items-center bg-white">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="text-sm text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
          >
            ← Dashboard
          </button>
          <span className="text-slate-300">|</span>
          <button
            onClick={copyRoomId}
            className="text-xs font-mono text-slate-500 hover:text-slate-900 transition-colors px-2 py-1 rounded hover:bg-slate-100 cursor-pointer"
            title="Copy room ID"
          >
            {roomId.slice(0, 8)}…{roomId.slice(-4)}
          </button>
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-medium border ${
              connected
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-red-50 text-red-700 border-red-200'
            }`}
          >
            ● {connected ? 'Live' : 'Offline'}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={language}
            onChange={handleLanguageChange}
            className="border border-slate-200 rounded-lg px-2.5 py-1 text-sm text-slate-700 font-mono bg-white"
          >
            {LANGUAGES.map((lang) => (
              <option key={lang} value={lang}>{lang}</option>
            ))}
          </select>

          <div className="flex -space-x-2">
            {users.map((u) => (
              <div
                key={u.userId}
                title={u.username}
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold border-2 border-white shadow-sm"
                style={{ backgroundColor: getUserColor(u.userId) }}
              >
                {u.username[0]?.toUpperCase()}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Editor + Chat */}
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1">
          <Editor
            height="100%"
            defaultLanguage="javascript"
            language={language}
            onMount={handleEditorMount}
            theme="vs-dark"
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              fontFamily: 'JetBrains Mono, ui-monospace, monospace',
              padding: { top: 16 },
            }}
          />
        </div>
        <ChatPanel
          socket={socket}
          roomId={roomId}
          currentUserId={user?.id}
        />
      </div>
    </div>
  );
};

export default Room;