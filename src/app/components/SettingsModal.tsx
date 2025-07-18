'use client';
import React, { useState, useEffect } from 'react';
import SettingsIcon from '@mui/icons-material/Settings';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import RecordVoiceOverIcon from '@mui/icons-material/RecordVoiceOver';
import LanguageIcon from '@mui/icons-material/Language';

const VOICES = [
  { value: 'alloy', label: 'Alloy' },
  { value: 'echo', label: 'Echo' },
  { value: 'fable', label: 'Fable' },
  { value: 'onyx', label: 'Onyx' },
  { value: 'nova', label: 'Nova' },
  { value: 'shimmer', label: 'Shimmer' },
];
const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'th', label: 'ไทย' },
  { value: 'ja', label: '日本語' },
  { value: 'zh', label: '中文' },
  { value: 'es', label: 'Español' },
  { value: 'fr', label: 'Français' },
];

export default function SettingsModal({ open, onClose }: { open: boolean, onClose: () => void }) {
  const [apiKey, setApiKey] = useState('');
  const [voice, setVoice] = useState('alloy');
  const [language, setLanguage] = useState('en');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (open) {
      setApiKey(localStorage.getItem('openai_api_key') || '');
      setVoice(localStorage.getItem('openai_voice') || 'alloy');
      setLanguage(localStorage.getItem('openai_language') || 'en');
    }
  }, [open]);

  const handleSave = () => {
    localStorage.setItem('openai_api_key', apiKey);
    localStorage.setItem('openai_voice', voice);
    localStorage.setItem('openai_language', language);
    setSaved(true);
    setTimeout(() => setSaved(false), 1200);
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div
        className="w-full max-w-lg p-8 rounded-2xl shadow-xl border relative animate-fade-in"
        style={{
          background: 'var(--sidebar)',
          border: '1px solid var(--sidebar-border)',
          color: 'var(--foreground)',
        }}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-xl p-1 transition"
          style={{ color: 'var(--icon-muted)' }}
          title="Close"
          onMouseOver={e => (e.currentTarget.style.color = 'var(--icon)')}
          onMouseOut={e => (e.currentTarget.style.color = 'var(--icon-muted)')}
        >
          ×
        </button>
        <div className="flex items-center gap-3 mb-8">
          <SettingsIcon style={{ fontSize: 32, color: 'var(--icon)' }} />
          <h2 className="text-2xl font-bold tracking-tight">AI Voice Settings</h2>
        </div>
        <div className="space-y-6">
          <div>
            <label className="block mb-2 font-medium flex items-center gap-2">
              <VpnKeyIcon style={{ fontSize: 20, color: 'var(--icon-muted)' }} />
              OpenAI API Key
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
              style={{
                background: 'var(--input-bg)',
                color: 'var(--foreground)',
                border: '1px solid var(--input-border)',
              }}
              placeholder="sk-..."
              autoComplete="off"
            />
          </div>
          <div>
            <label className="block mb-2 font-medium flex items-center gap-2">
              <RecordVoiceOverIcon style={{ fontSize: 20, color: 'var(--icon-muted)' }} />
              Voice
            </label>
            <select
              value={voice}
              onChange={e => setVoice(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
              style={{
                background: 'var(--input-bg)',
                color: 'var(--foreground)',
                border: '1px solid var(--input-border)',
              }}
            >
              {VOICES.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block mb-2 font-medium flex items-center gap-2">
              <LanguageIcon style={{ fontSize: 20, color: 'var(--icon-muted)' }} />
              Language
            </label>
            <select
              value={language}
              onChange={e => setLanguage(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
              style={{
                background: 'var(--input-bg)',
                color: 'var(--foreground)',
                border: '1px solid var(--input-border)',
              }}
            >
              {LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
            </select>
          </div>
        </div>
        <div className="flex justify-end mt-8">
          <button
            onClick={handleSave}
            className="font-semibold px-8 py-2 rounded-lg shadow transition"
            style={{
              background: 'var(--icon)',
              color: 'var(--background)',
              border: '1px solid var(--sidebar-border)',
            }}
            onMouseOver={e => (e.currentTarget.style.opacity = '0.85')}
            onMouseOut={e => (e.currentTarget.style.opacity = '1')}
          >
            Save
          </button>
          {saved && <span className="ml-4 text-green-600 font-medium self-center">Saved!</span>}
        </div>
      </div>
    </div>
  );
} 