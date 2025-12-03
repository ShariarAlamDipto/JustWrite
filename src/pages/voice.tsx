import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Nav } from '../components/Nav';
import { useAuth } from '../lib/useAuth';

interface VoiceEntry {
  id: string;
  title: string;
  audio_url?: string;
  audio_duration?: number;
  transcript?: string;
  created_at: string;
  metadata?: any;
}

export default function VoiceEntriesPage() {
  const { user, loading: authLoading, token } = useAuth();
  const [entries, setEntries] = useState<VoiceEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [recording, setRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [currentPlaying, setCurrentPlaying] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Load entries
  const loadEntries = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/voice-entries', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        setEntries(json.voiceEntries || []);
      }
    } catch (err) {
      console.error('Failed to load voice entries:', err);
    }
    setLoading(false);
  }, [token]);

  useEffect(() => {
    if (user && token) {
      loadEntries();
    }
  }, [user, token, loadEntries]);

  // Start recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.start(1000); // Collect data every second
      setRecording(true);
      setRecordingTime(0);
      
      timerRef.current = setInterval(() => {
        setRecordingTime(t => t + 1);
      }, 1000);
    } catch (err) {
      console.error('Failed to start recording:', err);
      alert('Could not access microphone. Please grant permission.');
    }
  };

  // Stop recording
  const stopRecording = async () => {
    if (!mediaRecorderRef.current) return;

    return new Promise<Blob>((resolve) => {
      mediaRecorderRef.current!.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        resolve(audioBlob);
      };
      mediaRecorderRef.current!.stop();
      mediaRecorderRef.current!.stream.getTracks().forEach(track => track.stop());
    });
  };

  // Save recording
  const saveRecording = async () => {
    if (!token || !user) return;
    
    setRecording(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    const audioBlob = await stopRecording();
    if (!audioBlob || audioBlob.size === 0) {
      alert('No audio recorded');
      return;
    }

    const title = prompt('Enter a title for your voice note:', 
      `Voice Note ${new Date().toLocaleDateString()}`);
    
    if (!title) {
      return; // Cancelled
    }

    setUploading(true);
    
    try {
      // First, upload the audio file to Supabase Storage via a special endpoint
      // For web, we'll use base64 encoding
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      
      reader.onloadend = async () => {
        const base64Audio = reader.result as string;
        
        // Create voice entry with embedded audio data
        // Note: For production, you'd want a proper file upload endpoint
        const res = await fetch('/api/voice-entries', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            title,
            audio_duration: recordingTime,
            metadata: {
              format: 'webm',
              recorded_on: 'web',
              // In production, upload to storage and store URL
              audio_data: base64Audio
            }
          })
        });

        if (res.ok) {
          const json = await res.json();
          setEntries(prev => [json.voiceEntry, ...prev]);
        } else {
          alert('Failed to save voice entry');
        }
        setUploading(false);
      };
    } catch (err) {
      console.error('Failed to save:', err);
      alert('Failed to save voice entry');
      setUploading(false);
    }
  };

  // Cancel recording
  const cancelRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    audioChunksRef.current = [];
    setRecording(false);
    setRecordingTime(0);
  };

  // Play audio
  const playAudio = (entry: VoiceEntry) => {
    if (!entry.metadata?.audio_data) return;
    
    if (currentPlaying === entry.id) {
      audioRef.current?.pause();
      setCurrentPlaying(null);
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
    }

    const audio = new Audio(entry.metadata.audio_data);
    audioRef.current = audio;
    audio.play();
    setCurrentPlaying(entry.id);

    audio.onended = () => {
      setCurrentPlaying(null);
    };
  };

  // Delete entry
  const deleteEntry = async (id: string) => {
    if (!token || !confirm('Delete this voice entry?')) return;
    
    try {
      const res = await fetch(`/api/voice-entries/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setEntries(prev => prev.filter(e => e.id !== id));
      }
    } catch (err) {
      console.error('Failed to delete:', err);
    }
  };

  // Format time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Format date
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString();
  };

  if (authLoading) {
    return (
      <>
        <Nav />
        <main className="container" style={{ padding: '2rem', textAlign: 'center' }}>
          <p>Loading...</p>
        </main>
      </>
    );
  }

  if (!user) {
    return (
      <>
        <Nav />
        <main className="container" style={{ padding: '2rem', textAlign: 'center' }}>
          <h2>Voice Entries</h2>
          <p style={{ color: 'var(--muted)', marginTop: '1rem' }}>
            Please sign in to access voice entries.
          </p>
        </main>
      </>
    );
  }

  return (
    <>
      <Nav />
      <main className="container" style={{ padding: '2rem 1rem', maxWidth: '800px', margin: '0 auto' }}>
        <h1 style={{ marginBottom: '1.5rem' }}>Voice Entries</h1>

        {/* Recording Control */}
        <div style={{
          padding: '2rem',
          background: 'var(--card-bg)',
          borderRadius: '12px',
          border: '1px solid var(--border)',
          textAlign: 'center',
          marginBottom: '2rem'
        }}>
          {recording && (
            <div style={{ marginBottom: '1rem' }}>
              <span style={{
                display: 'inline-block',
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                background: '#ff4444',
                marginRight: '8px',
                animation: 'pulse 1s infinite'
              }} />
              <span style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#ff4444' }}>
                Recording... {formatTime(recordingTime)}
              </span>
            </div>
          )}
          
          {uploading ? (
            <div style={{ padding: '1rem' }}>
              <span>Saving...</span>
            </div>
          ) : recording ? (
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button
                onClick={saveRecording}
                style={{
                  padding: '1rem 2rem',
                  background: 'var(--accent)',
                  color: 'black',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                ✓ Save
              </button>
              <button
                onClick={cancelRecording}
                style={{
                  padding: '1rem 2rem',
                  background: 'transparent',
                  color: 'var(--fg)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
              >
                ✕ Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={startRecording}
              style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                background: 'var(--accent)',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto',
                boxShadow: '0 0 20px rgba(0, 255, 213, 0.3)'
              }}
            >
              <svg width="32" height="32" viewBox="0 0 24 24" fill="black">
                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
              </svg>
            </button>
          )}
          
          {!recording && !uploading && (
            <p style={{ marginTop: '0.75rem', color: 'var(--muted)', fontSize: '0.875rem' }}>
              Tap to start recording
            </p>
          )}
        </div>

        {/* Entries List */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <p>Loading entries...</p>
          </div>
        ) : entries.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--muted)' }}>
            <svg width="64" height="64" viewBox="0 0 24 24" fill="currentColor" style={{ opacity: 0.3 }}>
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
              <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
            </svg>
            <p style={{ marginTop: '1rem' }}>No voice entries yet</p>
            <p style={{ fontSize: '0.875rem' }}>Tap the microphone to start recording</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {entries.map(entry => (
              <div
                key={entry.id}
                style={{
                  padding: '1rem',
                  background: 'var(--card-bg)',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem'
                }}
              >
                {/* Play button */}
                <button
                  onClick={() => playAudio(entry)}
                  disabled={!entry.metadata?.audio_data}
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    background: currentPlaying === entry.id ? 'var(--accent)' : 'var(--border)',
                    border: 'none',
                    cursor: entry.metadata?.audio_data ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                >
                  {currentPlaying === entry.id ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="black">
                      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="var(--fg)">
                      <path d="M8 5v14l11-7z"/>
                    </svg>
                  )}
                </button>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>
                    {entry.title}
                  </div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--muted)', display: 'flex', gap: '1rem' }}>
                    <span>⏱ {entry.audio_duration ? formatTime(entry.audio_duration) : '0:00'}</span>
                    <span>📅 {formatDate(entry.created_at)}</span>
                  </div>
                  {entry.transcript && (
                    <p style={{ 
                      marginTop: '0.5rem', 
                      fontSize: '0.875rem', 
                      color: 'var(--muted)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {entry.transcript}
                    </p>
                  )}
                </div>

                {/* Delete */}
                <button
                  onClick={() => deleteEntry(entry.id)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '0.5rem',
                    color: 'var(--muted)'
                  }}
                >
                  🗑️
                </button>
              </div>
            ))}
          </div>
        )}
      </main>

      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </>
  );
}
