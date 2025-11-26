import { NextApiRequest, NextApiResponse } from 'next';
import { withAuth } from '../../lib/withAuth';
import { sanitizeInput, validateContentLength, checkRateLimit } from '../../lib/security';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  return withAuth(req, res, async (req, res, userId) => {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return res.status(405).json({ error: 'Method Not Allowed' });
    }

    // SECURITY: Rate limiting for AI endpoints
    const rateLimit = checkRateLimit(userId + ':brainstorm', 30, 60000);
    if (!rateLimit.allowed) {
      return res.status(429).json({ error: 'Too many requests. Please wait before processing more text.' });
    }

    const { text } = req.body;

    // SECURITY: Sanitize and validate input
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text is required' });
    }
    
    const sanitizedText = sanitizeInput(text);
    if (!validateContentLength(sanitizedText, 50000)) {
      return res.status(400).json({ error: 'Text must be between 1 and 50000 characters' });
    }

    // Try LLM first, then fall back to heuristic
    let tasks = [];

    // Try Groq
    const groqUrl = process.env.GROQ_API_URL;
    const groqKey = process.env.GROQ_API_KEY;

    // SECURITY: Removed debug logging

    if (groqUrl && groqKey) {
      try {
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
              content: sanitizedText, // SECURITY: Use sanitized text
            },
          ],
          temperature: 0.7,
          max_tokens: 1024,
        }),
      });        if (response.ok) {
          const data = await response.json();
          const content = data.choices?.[0]?.message?.content;
          if (content) {
            try {
              // Extract JSON from the response (handle cases where LLM includes markdown or extra text)
              const jsonMatch = content.match(/\{[\s\S]*\}/);
              const jsonStr = jsonMatch ? jsonMatch[0] : content;
              const parsed = JSON.parse(jsonStr);
              // SECURITY: Sanitize and limit task output
              tasks = (parsed.tasks || []).slice(0, 5).map((t: any) => ({
                ...t,
                title: (t.title || '').slice(0, 200),
                description: (t.description || '').slice(0, 1000)
              }));
            } catch (e) {
              // SECURITY: Silent fail, fall through to heuristic
            }
          }
        }
      } catch (err) {
        // SECURITY: Silent fail, fall through to heuristic
      }
    }

    // Fallback: heuristic extraction
    if (tasks.length === 0) {
      tasks = extractTasksHeuristic(sanitizedText);
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
