'use client';
import React, { useRef, useState, useEffect } from 'react';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import SendIcon from '@mui/icons-material/Send';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';

const WEBHOOK_URL = 'https://example.com/webhook'; // Placeholder

const newSession = () => ({
  id: Date.now().toString(),
  title: 'New Chat',
  messages: [
    { sender: 'bot', text: 'Welcome to AI Chat!' },
  ],
});

function loadSessions() {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem('chat_sessions') || '[]');
  } catch {
    return [];
  }
}
function saveSessions(sessions: any[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('chat_sessions', JSON.stringify(sessions));
}

const ChatPage = () => {
  // Theme
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const preferred = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    setTheme(preferred);
    setMounted(true);
  }, []);
  useEffect(() => {
    if (!mounted) return;
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme, mounted]);

  // Sessions
  const [sessions, setSessions] = useState<any[]>([]);
  const [currentId, setCurrentId] = useState<string>('');
  const [input, setInput] = useState('');
  const [voiceMode, setVoiceMode] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const voiceTimeoutRef = useRef<any>(null);

  // Load sessions on mount
  useEffect(() => {
    const loaded = loadSessions();
    if (loaded.length === 0) {
      const s = newSession();
      setSessions([s]);
      setCurrentId(s.id);
      saveSessions([s]);
    } else {
      setSessions(loaded);
      setCurrentId(loaded[0].id);
    }
  }, []);
  useEffect(() => { saveSessions(sessions); }, [sessions]);

  const currentSession = sessions.find((s) => s.id === currentId);
  const setCurrentSession = (updater: (s: any) => any) => {
    setSessions((prev) => prev.map((s) => (s.id === currentId ? updater(s) : s)));
  };

  // --- Webhook send function ---
  const sendToWebhook = async (payload: any, isFile = false) => {
    try {
      let response;
      if (isFile) {
        response = await fetch(WEBHOOK_URL, {
          method: 'POST',
          body: payload, // FormData
        });
      } else {
        response = await fetch(WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }
      if (!response.ok) throw new Error('Webhook error');
      const data = await response.json();
      return data;
    } catch (e) {
      return { reply: 'This is a simulated response from the bot.' };
    }
  };

  // --- Text message send ---
  const handleSend = async () => {
    if (!input.trim() || !currentSession) return;
    setCurrentSession((s: any) => ({
      ...s,
      messages: [...s.messages, { sender: 'user', text: input }],
    }));
    setInput('');
    const res = await sendToWebhook({ message: input });
    setCurrentSession((s: any) => ({
      ...s,
      messages: [...s.messages, { sender: 'bot', text: res.reply }],
    }));
    if (voiceMode) speakText(res.reply);
  };

  // --- File upload ---
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentSession) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    const res = await sendToWebhook(formData, true);
    setCurrentSession((s: any) => ({
      ...s,
      messages: [
        ...s.messages,
        { sender: 'user', text: `📎 Sent file: ${file.name}` },
        { sender: 'bot', text: res.reply },
      ],
    }));
    setUploading(false);
    if (voiceMode) speakText(res.reply);
  };

  // --- Voice mode toggle ---
  const handleVoiceToggle = () => {
    if (voiceMode) {
      setVoiceMode(false);
      setListening(false);
      setSpeaking(false);
      if (recognitionRef.current) recognitionRef.current.abort();
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
      if (voiceTimeoutRef.current) clearTimeout(voiceTimeoutRef.current);
    } else {
      setVoiceMode(true);
    }
  };

  // --- Speech-to-Text (STT) ---
  const startListening = () => {
    if (!voiceMode) return;
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      alert('Speech Recognition not supported in this browser.');
      return;
    }
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'th-TH';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = async (event: any) => {
      if (!voiceMode) return;
      const transcript = event.results[0][0].transcript;
      setCurrentSession((s: any) => ({
        ...s,
        messages: [...s.messages, { sender: 'user', text: transcript }],
      }));
      setListening(false);
      const res = await sendToWebhook({ message: transcript });
      setCurrentSession((s: any) => ({
        ...s,
        messages: [...s.messages, { sender: 'bot', text: res.reply }],
      }));
      speakText(res.reply);
    };
    recognition.onerror = (event: any) => {
      setListening(false);
    };
    recognition.onend = () => {
      setListening(false);
    };
    recognitionRef.current = recognition;
    setListening(true);
    recognition.start();
  };

  // --- Text-to-Speech (TTS) ---
  const speakText = (text: string) => {
    if (!('speechSynthesis' in window)) return;
    setSpeaking(true);
    const utter = new window.SpeechSynthesisUtterance(text);
    utter.lang = 'th-TH';
    utter.onend = () => {
      setSpeaking(false);
      if (voiceMode) {
        voiceTimeoutRef.current = setTimeout(() => { if (voiceMode) startListening(); }, 500);
      }
    };
    window.speechSynthesis.speak(utter);
  };

  // --- Voice mode effect ---
  useEffect(() => {
    if (voiceMode && !listening && !speaking) {
      startListening();
    }
    if (!voiceMode) {
      if (recognitionRef.current) recognitionRef.current.abort();
      setListening(false);
      setSpeaking(false);
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
      if (voiceTimeoutRef.current) clearTimeout(voiceTimeoutRef.current);
    }
  }, [voiceMode]);

  // --- Sidebar actions ---
  const handleNewChat = () => {
    const s = newSession();
    setSessions((prev) => [s, ...prev]);
    setCurrentId(s.id);
  };
  const handleSelectSession = (id: string) => setCurrentId(id);
  const handleDeleteSession = (id: string) => {
    let idx = sessions.findIndex((s) => s.id === id);
    let newSessions = sessions.filter((s) => s.id !== id);
    setSessions(newSessions);
    if (id === currentId && newSessions.length > 0) {
      setCurrentId(newSessions[Math.max(0, idx - 1)].id);
    } else if (newSessions.length === 0) {
      const s = newSession();
      setSessions([s]);
      setCurrentId(s.id);
    }
  };

  if (!mounted) return null;
  return (
    <div className="flex h-screen bg-gray-100 dark:bg-zinc-900 text-gray-900 dark:text-gray-100 font-sans">
      {/* Sidebar */}
      <aside className="w-72 bg-white dark:bg-zinc-800 border-r border-gray-200 dark:border-zinc-700 flex flex-col shadow-sm">
        <div className="p-6 border-b border-gray-200 dark:border-zinc-700 flex items-center gap-3">
          <span className="font-bold text-xl tracking-wide text-blue-600 dark:text-blue-400">SK ChatAI</span>
          <button onClick={handleNewChat} title="New chat" className="ml-auto rounded-lg p-2 bg-gray-100 dark:bg-zinc-700 hover:bg-blue-100 dark:hover:bg-zinc-600 transition-colors">
            <AddIcon className="text-blue-600 dark:text-blue-400" />
          </button>
          <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} title="Toggle theme" className="rounded-lg p-2 bg-gray-100 dark:bg-zinc-700 hover:bg-blue-100 dark:hover:bg-zinc-600 ml-2 transition-colors">
            {theme === 'light' ? <Brightness4Icon className="text-blue-600" /> : <Brightness7Icon className="text-yellow-400" />}
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {sessions.map((s) => (
            <div
              key={s.id}
              className={`flex items-center rounded-lg mb-1 px-3 py-2 cursor-pointer transition-colors ${s.id === currentId ? 'bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-300 font-semibold' : 'hover:bg-gray-100 dark:hover:bg-zinc-700'}`}
              onClick={() => handleSelectSession(s.id)}
            >
              <span className="flex-1 truncate text-base">{s.title}</span>
              <button
                onClick={e => { e.stopPropagation(); handleDeleteSession(s.id); }}
                className="ml-2 p-1 rounded hover:bg-red-100 dark:hover:bg-red-900"
              >
                <DeleteIcon className="text-red-400" fontSize="small" />
              </button>
            </div>
          ))}
        </div>
        <div className="p-4 text-xs text-gray-400 dark:text-zinc-500 text-center">Powered by SK ChatAI</div>
      </aside>
      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col bg-gray-100 dark:bg-zinc-900 relative">
        {/* Chat messages */}
        <div className="flex-1 overflow-y-auto px-0 sm:px-0 md:px-0 py-10 md:py-14 flex flex-col gap-4 md:gap-6 bg-gray-100 dark:bg-zinc-900" style={{ minHeight: 0 }}>
          <div className="max-w-2xl w-full mx-auto flex flex-col gap-4 md:gap-6 px-2 sm:px-4 md:px-0">
            {currentSession?.messages.map((msg: any, i: number) => (
              <div key={i} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} items-end`}>
                <span className={`inline-block rounded-2xl px-5 py-3 max-w-[80%] md:max-w-[70%] break-words text-base md:text-lg shadow-sm border ${msg.sender === 'user'
                  ? 'bg-blue-600 text-white border-blue-200 dark:bg-blue-500 dark:text-white dark:border-blue-700 rounded-br-md'
                  : 'bg-white text-gray-900 border-gray-200 dark:bg-zinc-800 dark:text-gray-100 dark:border-zinc-700 rounded-bl-md'
                  }`}>
                  {msg.text}
                </span>
              </div>
            ))}
            {listening && voiceMode && (
              <div className="text-center text-green-500 font-semibold">Listening...</div>
            )}
            {speaking && voiceMode && (
              <div className="text-center text-blue-500 font-semibold">Speaking...</div>
            )}
          </div>
        </div>
        {/* Floating Input Bar */}
        <div className="fixed left-72 right-0 bottom-0 bg-white dark:bg-zinc-800 border-t border-gray-200 dark:border-zinc-700 shadow-lg px-4 md:px-12 py-4 flex gap-2 md:gap-4 items-center z-10">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            title="Upload file"
            className={`rounded-full p-2 ${uploading ? 'bg-gray-200 dark:bg-zinc-700' : 'hover:bg-blue-100 dark:hover:bg-zinc-700'} transition-colors`}
          >
            <AttachFileIcon className={`text-blue-600 dark:text-blue-400 ${uploading ? 'opacity-50' : ''}`} />
          </button>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            onChange={handleFileChange}
            accept="*"
          />
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder={voiceMode ? 'Voice mode active...' : 'Type a message'}
            disabled={voiceMode}
            className="flex-1 px-5 py-3 rounded-2xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-900 text-base md:text-lg outline-none focus:border-blue-400 dark:focus:border-blue-400 transition-colors"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || voiceMode}
            title="Send"
            className={`rounded-full p-2 bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:bg-blue-300 disabled:cursor-not-allowed`}
          >
            <SendIcon />
          </button>
          <button
            onClick={handleVoiceToggle}
            title={voiceMode ? 'Turn off voice mode' : 'Turn on voice mode'}
            className={`rounded-full p-2 ${voiceMode ? 'bg-green-100 dark:bg-green-900' : 'hover:bg-gray-100 dark:hover:bg-zinc-700'} transition-colors`}
          >
            {voiceMode ? <MicIcon className="text-green-500" /> : <MicOffIcon className="text-gray-400" />}
          </button>
        </div>
      </main>
    </div>
  );
};

export default ChatPage;
