import { NextApiRequest, NextApiResponse } from 'next';
import { getEntryById, updateEntrySummary, createTasksBulk } from '../../lib/storage';
import { randomUUID } from 'crypto';

function extractTasksFromText(text: string) {
  // very simple heuristic extraction for prototype/demo
  const lines = text.split(/\n|\.\s+/).map(s => s.trim()).filter(Boolean);
  const verbs = ['Call', 'Email', 'Schedule', 'Buy', 'Pay', 'Finish', 'Submit', 'Follow', 'Review', 'Plan', 'Book', 'Arrange', 'Remind', 'Reply'];
  const tasks: any[] = [];
  for (const line of lines) {
    for (const v of verbs) {
      if (line.startsWith(v) || line.startsWith(v.toLowerCase())) {
        tasks.push({ id: randomUUID(), title: line, description: '', priority: 'medium', source_hint: 'heuristic' });
        break;
      }
    }
  }
  return tasks;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  const { entryId, customText } = req.body;
  
  // Support either entryId (from existing entry) or customText (from new entry form)
  let contentToSummarize = '';
  
  if (customText) {
    contentToSummarize = customText;
  } else if (entryId) {
    const entry = await getEntryById(entryId as string);
    if (!entry) return res.status(404).json({ error: 'entry not found' });
    contentToSummarize = entry.content;
  } else {
    return res.status(400).json({ error: 'entryId or customText required' });
  }

  // Provider priority: GEMINI (if GEMINI_API_KEY) -> GROQ (if GROQ_API_URL+GROQ_API_KEY) -> OpenAI (OPENAI_API_KEY) -> fallback heuristic
  const geminiKey = process.env.GEMINI_API_KEY;
  const groqUrl = process.env.GROQ_API_URL;
  const groqKey = process.env.GROQ_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  let summary = '';
  let tasks: any[] = [];

  try {
    // Try GEMINI provider first (free and fast)
    if (geminiKey) {
      try {
        const prompt = `Summarize the following journal entry and extract 2-5 actionable tasks. Return ONLY valid JSON: {"summary": "string (max 100 words)", "tasks": [{"title": "string", "description": "string or null", "priority": "low|medium|high"}]}. Entry:\n${contentToSummarize}`;
        
        const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { maxOutputTokens: 500, temperature: 0.3 }
          })
        });
        
        const j = await resp.json();
        const text = j?.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (text) {
          try {
            const jsonStart = text.indexOf('{');
            const jsonEnd = text.lastIndexOf('}');
            const jsonText = jsonStart >= 0 && jsonEnd > jsonStart ? text.slice(jsonStart, jsonEnd + 1) : text;
            const parsed = JSON.parse(jsonText);
            summary = (parsed.summary || '').slice(0, 300); // cap at 300 chars
            tasks = (parsed.tasks || []).map((t: any) => ({ title: t.title, description: t.description || '', priority: t.priority || 'medium' }));
          } catch (e) {
            console.warn('Gemini JSON parse error, falling back to heuristic');
            tasks = extractTasksFromText(contentToSummarize);
            summary = contentToSummarize.slice(0, 300) + (contentToSummarize.length > 300 ? '…' : '');
          }
        }
      } catch (err) {
        console.error('gemini distill error', err);
        // fall through to next provider
      }
    }

    // Try GROQ provider if GEMINI didn't populate tasks
    if (!tasks.length && groqUrl && groqKey) {
      try {
        const prompt = `Summarize and extract actionable tasks from the following journal entry. Return strict JSON: {"summary": string, "tasks": [{"title": string, "description": string|null, "priority": "low"|"medium"|"high", "due": null|string}] }\\nEntry:\n'''${contentToSummarize}'''`;
        const resp = await fetch(groqUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${groqKey}` },
          body: JSON.stringify({ prompt, input: contentToSummarize })
        });
        const j = await resp.json();
        // Expect provider to return JSON with summary and tasks, but be defensive
        if (j && (j.summary || j.tasks)) {
          summary = j.summary || '';
          tasks = j.tasks || [];
        } else if (typeof j === 'string') {
          // try parse string
          const jsonStart = j.indexOf('{');
          const jsonText = jsonStart >= 0 ? j.slice(jsonStart) : j;
          try {
            const parsed = JSON.parse(jsonText);
            summary = parsed.summary || '';
            tasks = parsed.tasks || [];
          } catch (e) {
            // fallback
            tasks = extractTasksFromText(contentToSummarize);
            summary = contentToSummarize.slice(0, 300) + (contentToSummarize.length > 300 ? '…' : '');
          }
        } else {
          tasks = extractTasksFromText(contentToSummarize);
          summary = contentToSummarize.slice(0, 300) + (contentToSummarize.length > 300 ? '…' : '');
        }
      } catch (err) {
        console.error('groq distill error', err);
        // fall through to next provider
      }
    }

    // If GROQ didn't populate tasks, try OpenAI if available
    if (!tasks.length && openaiKey) {
      const prompt = `You are an assistant that converts a personal journal entry into a short summary and a list of actionable tasks. Return only valid JSON with fields: { \"summary\": string, \"tasks\": [ {\"title\":string, \"description\":string|null, \"priority\":\"low\"|\"medium\"|\"high\", \"due\": null | string } ] }. Entry:\n'''${contentToSummarize}'''`;

      const resp = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${openaiKey}` },
        body: JSON.stringify({ model: 'gpt-3.5-turbo', messages: [{ role: 'system', content: 'You output only JSON.' }, { role: 'user', content: prompt }], max_tokens: 600 })
      });
      const j = await resp.json();
      const text = j?.choices?.[0]?.message?.content;
      if (text) {
        // try to parse JSON from model response
        const jsonStart = text.indexOf('{');
        const jsonText = jsonStart >= 0 ? text.slice(jsonStart) : text;
        try {
          const parsed = JSON.parse(jsonText);
          summary = parsed.summary || '';
          tasks = parsed.tasks || [];
        } catch (e) {
          // parsing failed — fallback to heuristic
          tasks = extractTasksFromText(contentToSummarize);
          summary = contentToSummarize.slice(0, 300) + (contentToSummarize.length > 300 ? '…' : '');
        }
      }
    } else if (!summary && !tasks.length) {
      // no key — fallback to heuristic + short summary
      summary = contentToSummarize.slice(0, 300) + (contentToSummarize.length > 300 ? '…' : '');
      tasks = extractTasksFromText(contentToSummarize);
    }
  } catch (err) {
    console.error('distill error', err);
    summary = contentToSummarize.slice(0, 300) + (contentToSummarize.length > 300 ? '…' : '');
    tasks = extractTasksFromText(contentToSummarize);
  }

  // persist summary and tasks via storage abstraction (only if we have a real entryId, not 'temp')
  if (entryId && entryId !== 'temp' && !customText) {
    // Only persist if we have a real entry ID and this is NOT a draft analysis
    try {
      const provider = geminiKey ? 'gemini' : (groqUrl && groqKey ? 'groq' : (openaiKey ? 'openai' : 'mock'));
      const modelName = provider === 'gemini' ? 'gemini-1.5-flash' : (provider === 'openai' ? 'gpt-3.5-turbo' : (provider === 'groq' ? 'groq-inference' : 'heuristic'));
      const ai_metadata = { provider, model: modelName, extracted_at: new Date().toISOString(), prompt_version: 'distill_v2' };
      await updateEntrySummary(entryId, summary, ai_metadata);
      const created = await createTasksBulk(tasks.map(t => ({ title: t.title || t, description: t.description || '', priority: t.priority || 'medium', status: 'todo' })), entryId);
      return res.status(200).json({ summary, tasks: created });
    } catch (err) {
      console.error('distill persist error:', err);
      // Fall through to just return results without persisting
      return res.status(200).json({ summary, tasks });
    }
  } else {
    // customText mode or temp mode: just return summary and tasks without saving
    return res.status(200).json({ summary, tasks });
  }
}
