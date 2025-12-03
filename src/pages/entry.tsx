import React, { useState, useEffect } from 'react';
import { Nav } from '@/components/Nav';
import { useAuth } from '@/lib/useAuth';
import MoodSlider from '@/components/MoodSlider';
import PromptCard from '@/components/PromptCard';
import AIExtractedTasks from '@/components/AIExtractedTasks';
import { encryptContent } from '@/lib/clientEncryption';

const SCIENCE_BACKED_PROMPTS = [
  {
    id: 'planning-1',
    category: 'Morning / Planning',
    question: 'What are the top 3 outcomes I want from today?',
    rationale: 'Forces prioritization; primes goal-directed behavior',
    icon: '🎯',
  },
  {
    id: 'planning-2',
    category: 'Morning / Planning',
    question: 'If I get interrupted, what will I do to still make progress? (write one "If-Then" plan)',
    rationale: 'Implementation intentions dramatically increase follow-through',
    icon: '📋',
  },
  {
    id: 'gratitude-1',
    category: 'Gratitude / Positive Affect',
    question: 'List three things you\'re grateful for today — small or big.',
    rationale: 'Short daily gratitude boosts positive affect and wellbeing',
    icon: '🙏',
  },
  {
    id: 'gratitude-2',
    category: 'Gratitude / Positive Affect',
    question: 'What went well yesterday?',
    rationale: 'Reinforces learning from small wins and increases optimism',
    icon: '✨',
  },
  {
    id: 'cbt-1',
    category: 'Emotional Processing / CBT',
    question: 'What situation caused the strongest emotion today? Describe what happened, the thought you had, and the emotion\'s intensity (0–10).',
    rationale: 'Structured recording helps identify automatic thoughts and reduce impact',
    icon: '💭',
  },
  {
    id: 'cbt-2',
    category: 'Emotional Processing / CBT',
    question: 'Now list one realistic alternative thought or interpretation.',
    rationale: 'Reappraisal decreases emotional intensity and improves regulation',
    icon: '🔄',
  },
  {
    id: 'reflection-1',
    category: 'Reflection & Learning',
    question: 'What\'s one lesson I learned recently that I want to keep in mind?',
    rationale: 'Promotes metacognition and consolidates learning from experience',
    icon: '📖',
  },
  {
    id: 'reflection-2',
    category: 'Reflection & Learning',
    question: 'What\'s the one thing I can do in the next 24 hours that would make tomorrow noticeably better?',
    rationale: 'Keeps journal→action funnel tight; easy candidates for tasks',
    icon: '🚀',
  },
  {
    id: 'expressive-1',
    category: 'Expressive / Stress',
    question: 'If you could say one honest thing right now, what is it? (Write for 10 minutes.)',
    rationale: 'Uncensored writing has therapeutic and mental health benefits',
    icon: '💬',
  },
  {
    id: 'closure-1',
    category: 'Micro-planning / Closure',
    question: 'Pick 1 task from today\'s extracted tasks and write its next step (one sentence).',
    rationale: 'Breaking tasks into immediate next steps reduces friction',
    icon: '✅',
  },
];

export default function EntryPage() {
  const { user, loading: authLoading, token } = useAuth();
  const [entryData, setEntryData] = useState({
    title: '',
    mood: 5,
    moodIntensity: 5,
    freeText: '',
    gratitude: ['', '', ''],
  });

  const [expandedSections, setExpandedSections] = useState({
    title: true,
    mood: true,
    freeText: true,
    gratitude: true,
    prompts: false,
    aiSummary: false,
    extractedTasks: false,
    advanced: false,
  });

  const [selectedPrompts, setSelectedPrompts] = useState<Set<string>>(new Set());
  const [promptAnswers, setPromptAnswers] = useState<Record<string, string>>({});
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [extractedTasks, setExtractedTasks] = useState<any[]>([]);
  const [savingStatus, setSavingStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [summarizing, setSummarizing] = useState(false);

  useEffect(() => {
    if (user && token) {
      // Auto-save on changes
      const timer = setTimeout(() => {
        if (entryData.freeText || entryData.title || Object.values(promptAnswers).some(v => v)) {
          saveEntry();
        }
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [entryData, promptAnswers, token]);

  async function saveEntry() {
    if (!token) return;
    setSavingStatus('saving');
    try {
      // Encrypt content before saving
      let contentToSave = entryData.freeText;
      let titleToSave = entryData.title;
      if (user?.id) {
        try {
          contentToSave = await encryptContent(entryData.freeText, user.id);
          if (titleToSave) {
            titleToSave = await encryptContent(titleToSave, user.id);
          }
        } catch (e) {
          console.error('Failed to encrypt:', e);
        }
      }
      
      const res = await fetch('/api/entries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          content: contentToSave,
          title: titleToSave,
          metadata: {
            mood: entryData.mood,
            moodIntensity: entryData.moodIntensity,
            gratitude: entryData.gratitude.filter(g => g.trim()),
            promptAnswers,
          },
        }),
      });

      if (res.ok) {
        setSavingStatus('saved');
        setTimeout(() => setSavingStatus('idle'), 2000);
      }
    } catch (err) {
      console.error('Failed to save entry:', err);
    }
  }

  async function generateAISummary() {
    if (!token || !entryData.freeText.trim()) return;
    setSummarizing(true);

    try {
      const combinedText = [
        entryData.title,
        entryData.freeText,
        Object.entries(promptAnswers)
          .map(([promptId, answer]) => `${promptId}: ${answer}`)
          .join('\n'),
      ]
        .filter(Boolean)
        .join('\n\n');

      // Use brainstorm endpoint to extract tasks
      const tasksRes = await fetch('/api/brainstorm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ text: combinedText }),
      });

      if (tasksRes.ok) {
        const tasksJson = await tasksRes.json();
        setExtractedTasks(tasksJson.tasks || []);
        setExpandedSections(prev => ({ ...prev, extractedTasks: true }));
      }

      // Generate summary
      const summaryRes = await fetch('/api/distill', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          entryId: 'temp',
          customText: combinedText,
        }),
      });

      if (summaryRes.ok) {
        const summaryJson = await summaryRes.json();
        setAiSummary(summaryJson.summary);
        setExpandedSections(prev => ({ ...prev, aiSummary: true }));
      }
    } catch (err) {
      console.error('Failed to generate AI summary:', err);
    }

    setSummarizing(false);
  }

  function toggleSection(section: string) {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  }

  function togglePrompt(promptId: string) {
    const newSelected = new Set(selectedPrompts);
    if (newSelected.has(promptId)) {
      newSelected.delete(promptId);
      const newAnswers = { ...promptAnswers };
      delete newAnswers[promptId];
      setPromptAnswers(newAnswers);
    } else {
      newSelected.add(promptId);
    }
    setSelectedPrompts(newSelected);
  }

  function updatePromptAnswer(promptId: string, answer: string) {
    setPromptAnswers(prev => ({
      ...prev,
      [promptId]: answer,
    }));
  }

  if (authLoading) {
    return (
      <>
        <Nav />
        <div style={styles.container}>
          <p style={styles.loading}>Loading...</p>
        </div>
      </>
    );
  }

  if (!user) {
    return (
      <>
        <Nav />
        <div style={styles.container}>
          <p style={styles.error}>Please sign in to create entries.</p>
        </div>
      </>
    );
  }

  return (
    <>
      <Nav />
      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.title}>NEW ENTRY</h1>
          <p style={styles.subtitle}>
            {new Date().toLocaleDateString('en-US', { 
              weekday: 'long', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
          <div style={styles.statusBar}>
            {savingStatus === 'saving' && <span style={styles.savingText}>💾 Saving...</span>}
            {savingStatus === 'saved' && <span style={styles.savedText}>✓ Saved</span>}
          </div>
        </div>

        {/* 1. Title */}
        <CollapsibleSection
          title="TITLE (optional)"
          icon="📌"
          isOpen={expandedSections.title}
          onToggle={() => toggleSection('title')}
        >
          <input
            type="text"
            placeholder="Give this entry a short label for search..."
            value={entryData.title}
            onChange={e => setEntryData(prev => ({ ...prev, title: e.target.value }))}
            style={styles.input}
          />
          <p style={styles.hint}>Short label helps you find entries later</p>
        </CollapsibleSection>

        {/* 2. Mood */}
        <CollapsibleSection
          title="MOOD"
          icon="😊"
          isOpen={expandedSections.mood}
          onToggle={() => toggleSection('mood')}
        >
          <MoodSlider
            mood={entryData.mood}
            intensity={entryData.moodIntensity}
            onMoodChange={mood => setEntryData(prev => ({ ...prev, mood }))}
            onIntensityChange={intensity => setEntryData(prev => ({ ...prev, moodIntensity: intensity }))}
          />
          <p style={styles.hint}>Mood + intensity helps track patterns over time</p>
        </CollapsibleSection>

        {/* 3. Free Text Entry */}
        <CollapsibleSection
          title="YOUR THOUGHTS"
          icon="💭"
          isOpen={expandedSections.freeText}
          onToggle={() => toggleSection('freeText')}
        >
          <textarea
            placeholder="Write freely here. Express yourself. Vent, dream, process, create."
            value={entryData.freeText}
            onChange={e => setEntryData(prev => ({ ...prev, freeText: e.target.value }))}
            rows={10}
            style={styles.textarea}
          />
          <p style={styles.hint}>{entryData.freeText.length} characters</p>
        </CollapsibleSection>

        {/* 4. Quick Gratitude */}
        <CollapsibleSection
          title="GRATITUDE (3 things)"
          icon="🙏"
          isOpen={expandedSections.gratitude}
          onToggle={() => toggleSection('gratitude')}
        >
          {[0, 1, 2].map(idx => (
            <textarea
              key={idx}
              placeholder={`Thing ${idx + 1} I'm grateful for (small or big)`}
              value={entryData.gratitude[idx]}
              onChange={e => {
                const newGratitude = [...entryData.gratitude];
                newGratitude[idx] = e.target.value;
                setEntryData(prev => ({ ...prev, gratitude: newGratitude }));
              }}
              rows={2}
              style={{
                ...styles.textarea,
                marginBottom: idx < 2 ? '1rem' : '0',
              }}
            />
          ))}
          <p style={styles.hint}>Write even tiny things — small wins count.</p>
        </CollapsibleSection>

        {/* 5. Science-Backed Prompts */}
        <CollapsibleSection
          title="GUIDED PROMPTS"
          icon="✨"
          isOpen={expandedSections.prompts}
          onToggle={() => toggleSection('prompts')}
        >
          <div style={styles.promptsGrid}>
            {SCIENCE_BACKED_PROMPTS.map(prompt => (
              <PromptCard
                key={prompt.id}
                prompt={prompt}
                isSelected={selectedPrompts.has(prompt.id)}
                answer={promptAnswers[prompt.id]}
                onToggle={() => togglePrompt(prompt.id)}
                onAnswerChange={answer => updatePromptAnswer(prompt.id, answer)}
              />
            ))}
          </div>
        </CollapsibleSection>

        {/* 6. AI Quick Summary & Tasks */}
        <div style={styles.aiSection}>
          <button
            onClick={generateAISummary}
            disabled={summarizing || !entryData.freeText.trim()}
            style={{
              ...styles.btnPrimary,
              opacity: summarizing || !entryData.freeText.trim() ? 0.6 : 1,
            }}
          >
            {summarizing ? 'AI ANALYZING…' : '✨ ANALYZE WITH AI'}
          </button>
          <p style={styles.hint}>Generates summary & extracts actionable tasks</p>
        </div>

        {/* 7. AI Summary */}
        {aiSummary && (
          <CollapsibleSection
            title="AI SUMMARY"
            icon="📊"
            isOpen={expandedSections.aiSummary}
            onToggle={() => toggleSection('aiSummary')}
          >
            <div style={styles.summaryBox}>{aiSummary}</div>
          </CollapsibleSection>
        )}

        {/* 8. Extracted Tasks */}
        {extractedTasks.length > 0 && (
          <CollapsibleSection
            title="EXTRACTED TO-DOS"
            icon="✓"
            isOpen={expandedSections.extractedTasks}
            onToggle={() => toggleSection('extractedTasks')}
          >
            <AIExtractedTasks
              tasks={extractedTasks}
              onAddTasks={async (tasks) => {
                try {
                  await Promise.all(
                    tasks.map(t =>
                      fetch('/api/tasks', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          'Authorization': `Bearer ${token}`,
                        },
                        body: JSON.stringify({
                          title: t.title,
                          description: t.description,
                          priority: t.priority,
                        }),
                      })
                    )
                  );
                  alert(`✓ Added ${tasks.length} task(s)`);
                  setExtractedTasks([]);
                } catch (err) {
                  console.error('Failed to add tasks:', err);
                }
              }}
            />
          </CollapsibleSection>
        )}

        {/* Save Button */}
        <div style={styles.actions}>
          <button onClick={saveEntry} style={styles.btnPrimary}>
            💾 SAVE ENTRY
          </button>
          <button
            onClick={() => {
              setEntryData({
                title: '',
                mood: 5,
                moodIntensity: 5,
                freeText: '',
                gratitude: ['', '', ''],
              });
              setPromptAnswers({});
              setSelectedPrompts(new Set());
              setAiSummary(null);
              setExtractedTasks([]);
            }}
            style={styles.btnSecondary}
          >
            🔄 CLEAR
          </button>
        </div>
      </div>
    </>
  );
}

function CollapsibleSection({
  title,
  icon,
  isOpen,
  onToggle,
  children,
}: {
  title: string;
  icon: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div style={styles.section}>
      <button
        onClick={onToggle}
        style={{
          ...styles.sectionHeader,
          background: isOpen ? 'rgba(0, 255, 213, 0.1)' : 'transparent',
        }}
      >
        <span>{icon} {title}</span>
        <span style={styles.toggleIcon}>{isOpen ? '▼' : '▶'}</span>
      </button>
      {isOpen && <div style={styles.sectionContent}>{children}</div>}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: 900,
    margin: '0 auto',
    padding: '0 1rem 3rem',
  },
  header: {
    textAlign: 'center',
    marginBottom: '2rem',
    paddingTop: '1rem',
  },
  title: {
    fontSize: '1.2rem',
    margin: '0 0 0.5rem',
    color: 'var(--accent)',
    textShadow: '0 0 10px rgba(0, 255, 213, 0.3)',
    letterSpacing: '0.1em',
  },
  subtitle: {
    fontSize: '0.75rem',
    color: 'var(--muted)',
    margin: 0,
    letterSpacing: '0.05em',
  },
  statusBar: {
    marginTop: '0.5rem',
    fontSize: '0.7rem',
    minHeight: '1.2rem',
  },
  savingText: {
    color: 'var(--accent)',
    animation: 'glow-pulse 1s ease-in-out infinite',
  },
  savedText: {
    color: 'var(--accent)',
  },
  section: {
    marginBottom: '1.5rem',
    border: '2px solid var(--muted)',
    background: 'var(--bg)',
    transition: 'all 0.2s',
  },
  sectionHeader: {
    width: '100%',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1rem',
    background: 'transparent',
    color: 'var(--accent)',
    border: 'none',
    fontFamily: '"Press Start 2P", monospace',
    fontSize: '0.7rem',
    cursor: 'pointer',
    transition: 'all 0.2s',
    textAlign: 'left',
  },
  toggleIcon: {
    fontSize: '0.6rem',
    transition: 'transform 0.2s',
  },
  sectionContent: {
    padding: '1rem',
    borderTop: '2px solid var(--muted)',
  },
  input: {
    width: '100%',
    background: 'var(--bg)',
    color: 'var(--fg)',
    border: '2px solid var(--muted)',
    padding: '0.75rem',
    fontFamily: 'monospace',
    fontSize: '0.75rem',
    marginBottom: '0.75rem',
  },
  textarea: {
    width: '100%',
    background: 'var(--bg)',
    color: 'var(--fg)',
    border: '2px solid var(--muted)',
    padding: '0.75rem',
    fontFamily: 'monospace',
    fontSize: '0.75rem',
    lineHeight: 1.6,
    resize: 'vertical',
  },
  hint: {
    fontSize: '0.65rem',
    color: 'var(--muted)',
    margin: '0.5rem 0 0',
    lineHeight: 1.4,
  },
  promptsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '1rem',
  },
  aiSection: {
    marginBottom: '1.5rem',
    padding: '1.5rem',
    background: 'rgba(0, 255, 213, 0.05)',
    border: '2px solid var(--accent)',
    textAlign: 'center',
  },
  btnPrimary: {
    background: 'var(--accent)',
    color: 'var(--bg)',
    border: 'none',
    padding: '0.75rem 1.5rem',
    fontFamily: '"Press Start 2P", monospace',
    fontSize: '0.65rem',
    cursor: 'pointer',
    fontWeight: 700,
    transition: 'all 0.2s',
    width: '100%',
  },
  btnSecondary: {
    background: 'transparent',
    color: 'var(--accent)',
    border: '2px solid var(--accent)',
    padding: '0.75rem 1.5rem',
    fontFamily: '"Press Start 2P", monospace',
    fontSize: '0.65rem',
    cursor: 'pointer',
    transition: 'all 0.2s',
    width: '100%',
  },
  summaryBox: {
    background: 'rgba(0, 255, 213, 0.1)',
    border: '1px solid var(--accent)',
    padding: '1rem',
    borderRadius: '2px',
    fontSize: '0.75rem',
    lineHeight: 1.6,
    color: 'var(--fg)',
  },
  actions: {
    display: 'flex',
    gap: '1rem',
    marginTop: '2rem',
  },
  loading: {
    fontSize: '0.75rem',
    color: 'var(--fg)',
    textAlign: 'center',
    padding: '2rem',
  },
  error: {
    fontSize: '0.75rem',
    color: '#ff3bff',
    textAlign: 'center',
    padding: '2rem',
  },
};
