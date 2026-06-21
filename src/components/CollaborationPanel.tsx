import React, { useState, useRef, useEffect } from 'react';
import { CollaborationUser, ChatMessage } from '../types';
import { X, Send, Users, MessageCircle, LogIn, LogOut, Radio, Undo2, Redo2 } from 'lucide-react';

interface CollaborationPanelProps {
  isConnected: boolean;
  isConnecting: boolean;
  roomId: string | null;
  userId: string | null;
  userName: string;
  users: CollaborationUser[];
  messages: ChatMessage[];
  error: string | null;
  showPanel: boolean;
  setShowPanel: (show: boolean) => void;
  joinRoom: (roomId: string, name: string) => void;
  leaveRoom: () => void;
  sendMessage: (text: string) => void;
  requestUndo?: () => void;
  requestRedo?: () => void;
}

export function CollaborationPanel({
  isConnected,
  isConnecting,
  roomId,
  userId,
  userName: _userName,
  users,
  messages,
  error,
  showPanel,
  setShowPanel,
  joinRoom,
  leaveRoom,
  sendMessage,
  requestUndo,
  requestRedo,
}: CollaborationPanelProps) {
  const [inputRoomId, setInputRoomId] = useState('');
  const [inputName, setInputName] = useState('');
  const [messageText, setMessageText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputRoomId.trim() && inputName.trim()) {
      joinRoom(inputRoomId.trim(), inputName.trim());
    }
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (messageText.trim()) {
      sendMessage(messageText.trim());
      setMessageText('');
    }
  };

  return (
    <div className="fixed right-4 bottom-4 z-30 flex flex-col items-end">
      {/* Toggle Button */}
      <button
        onClick={() => setShowPanel(!showPanel)}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-full shadow-lg transition-colors ${
          isConnected
            ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
            : 'bg-slate-700 hover:bg-slate-800 text-white'
        }`}
        title="Toggle Collaboration Panel"
      >
        {isConnected ? <Radio className="w-4 h-4 animate-pulse" /> : <Users className="w-4 h-4" />}
        <span className="text-sm font-medium">
          {isConnected ? `Room: ${roomId}` : 'Collaborate'}
        </span>
        {users.length > 0 && (
          <span className="ml-1 bg-white/20 text-white text-[10px] px-1.5 py-0.5 rounded-full">
            {users.length}
          </span>
        )}
      </button>

      {/* Panel */}
      {showPanel && (
        <div className="mt-3 w-80 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-slate-600" />
              <h3 className="text-sm font-semibold text-slate-900">Collaboration</h3>
              {isConnected && (
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              )}
            </div>
            <button
              onClick={() => setShowPanel(false)}
              className="text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="mx-4 mt-3 p-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">
              {error}
            </div>
          )}

          {/* Not Connected - Join Form */}
          {!roomId && (
            <div className="p-4 space-y-3">
              <p className="text-xs text-slate-500">
                Join a room to collaborate with others in real-time.
              </p>
              <form onSubmit={handleJoin} className="space-y-2">
                <div>
                  <label className="text-xs text-slate-500 block mb-1">Your Name</label>
                  <input
                    type="text"
                    value={inputName}
                    onChange={(e) => setInputName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 block mb-1">Room ID</label>
                  <input
                    type="text"
                    value={inputRoomId}
                    onChange={(e) => setInputRoomId(e.target.value)}
                    placeholder="Enter room ID"
                    className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={isConnecting || !isConnected}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium py-2 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isConnecting ? (
                    <span className="animate-pulse">Connecting...</span>
                  ) : (
                    <>
                      <LogIn className="w-4 h-4" />
                      Join Room
                    </>
                  )}
                </button>
              </form>
              {!isConnected && (
                <p className="text-xs text-amber-600 text-center">
                  Server not connected. Make sure the collaboration server is running.
                </p>
              )}
            </div>
          )}

          {/* Connected Room */}
          {roomId && (
            <div className="flex flex-col h-96">
              {/* Users List */}
              <div className="px-4 py-2 border-b border-slate-200 bg-slate-50/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-slate-600">Users ({users.length})</span>
                  <button
                    onClick={leaveRoom}
                    className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1"
                  >
                    <LogOut className="w-3 h-3" />
                    Leave
                  </button>
                </div>
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={requestUndo}
                    disabled={!requestUndo}
                    className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-white border border-slate-200 rounded-md text-xs text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    title="Request undo from all collaborators"
                  >
                    <Undo2 className="w-3 h-3" /> Undo
                  </button>
                  <button
                    onClick={requestRedo}
                    disabled={!requestRedo}
                    className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-white border border-slate-200 rounded-md text-xs text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    title="Request redo from all collaborators"
                  >
                    <Redo2 className="w-3 h-3" /> Redo
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {users.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-white border border-slate-200"
                      title={user.name}
                    >
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: user.color }}
                      />
                      <span className="text-[10px] text-slate-700 truncate max-w-[80px]">
                        {user.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
                {messages.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">
                    No messages yet. Start the conversation!
                  </p>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${
                        msg.userId === userId ? 'items-end' : 'items-start'
                      }`}
                    >
                      <div
                        className={`max-w-[85%] px-3 py-2 rounded-lg text-xs ${
                          msg.userId === userId
                            ? 'bg-indigo-100 text-indigo-900'
                            : 'bg-slate-100 text-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: msg.userColor }}
                          />
                          <span className="font-medium text-[10px] opacity-75">{msg.userName}</span>
                        </div>
                        <p className="break-words">{msg.text}</p>
                      </div>
                      <span className="text-[9px] text-slate-400 mt-0.5 px-1">
                        {new Date(msg.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <form onSubmit={handleSend} className="p-3 border-t border-slate-200 flex gap-2">
                <input
                  type="text"
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                />
                <button
                  type="submit"
                  disabled={!messageText.trim()}
                  className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
