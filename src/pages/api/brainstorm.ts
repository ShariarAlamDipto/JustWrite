import { NextApiRequest, NextApiResponse } from 'next';
import { withAuth } from '../../lib/withAuth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  return withAuth(req, res, async (req, res, userId) => {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { text } = req.body;

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: 'Text is required' });
    }

    // Try LLM first, then fall back to heuristic
    let tasks = [];

    // Try Groq
    const groqUrl = process.env.GROQ_API_URL;
    const groqKey = process.env.GROQ_API_KEY;

    console.log('[Brainstorm] Groq URL present:', !!groqUrl);
    console.log('[Brainstorm] Groq Key present:', !!groqKey);

    if (groqUrl && groqKey) {
      try {
        console.log('[Brainstorm] Calling Groq LLM...');
      const response = await fetch(groqUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${groqKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile', // Latest Groq model
          messages: [
            {
              role: 'system',
              content: `You are a task extraction assistant. Your ONLY response must be valid JSON, nothing else.
Extract 2-5 actionable tasks from the user's text.
Return ONLY this JSON format (no other text before or after):
{
  "tasks": [
    { "title": "string (brief, under 10 words)", "description": "string", "priority": "high" | "medium" | "low" }
  ]
}
Do not include markdown formatting or explanations.`,
            },
            {
              role: 'user',
              content: text,
            },
          ],
          temperature: 0.7,
          max_tokens: 1024,
        }),
      });        if (response.ok) {
          const data = await response.json();
          const content = data.choices?.[0]?.message?.content;
          console.log('[Brainstorm] Groq response received, content:', !!content);
          if (content) {
            try {
              // Extract JSON from the response (handle cases where LLM includes markdown or extra text)
              const jsonMatch = content.match(/\{[\s\S]*\}/);
              const jsonStr = jsonMatch ? jsonMatch[0] : content;
              const parsed = JSON.parse(jsonStr);
              tasks = (parsed.tasks || []).slice(0, 5); // Limit to 5 tasks
              console.log('[Brainstorm] Parsed tasks:', tasks.length);
            } catch (e) {
              console.error('[Brainstorm] Failed to parse JSON from:', content.slice(0, 100));
              console.error('[Brainstorm] Parse error:', (e as Error).message);
              // Fall through to heuristic
            }
          }
        } else {
          const errBody = await response.text();
          console.error('[Brainstorm] Groq API error:', response.status, errBody);
        }
      } catch (err) {
        console.error('[Brainstorm] Groq error:', err);
      }
    } else {
      console.log('[Brainstorm] Groq not configured, using heuristic');
    }

    // Fallback: heuristic extraction
    if (tasks.length === 0) {
      console.log('[Brainstorm] Using heuristic extraction');
      tasks = extractTasksHeuristic(text);
    }

    return res.status(200).json({ tasks });
  });
}

function extractTasksHeuristic(text: string): any[] {
  const tasks = [];
  
  // Common task patterns
  const patterns = [
    /(?:need to|should|must|gotta|have to|fix|complete|finish|start|implement|add|create|write|update|delete|remove|review|check|test|deploy|release|refactor|optimize|improve|investigate|research|analyze|document|setup|configure)\s+(.+?)(?:\.|,|;|$)/gi,
    /^[-•*]\s*(.+?)(?:\.|$)/gm,
  ];

  const lines = text.split('\n').filter(line => line.trim());
  const foundTasks = new Set<string>();

  for (const line of lines) {
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(line)) !== null) {
        const taskText = match[1]?.trim();
        if (taskText && taskText.length > 5 && taskText.length < 200 && !foundTasks.has(taskText)) {
          foundTasks.add(taskText);
          tasks.push({
            id: Math.random().toString(36).substr(2, 9),
            title: taskText.split(/\s+/).slice(0, 8).join(' '),
            description: taskText,
            priority: taskText.toLowerCase().includes('urgent') || taskText.toLowerCase().includes('critical') ? 'high' : 'medium',
          });
        }
      }
    }
  }

  return tasks.slice(0, 10); // Limit to 10 tasks
}
