// Daily Journaling Prompt System
// Categories: gratitude, reflection, emotional_checkin, morning_intentions, self_discovery, creative

export interface JournalPrompt {
  id: string;
  category: PromptCategory;
  text: string;
  example?: string;
}

export type PromptCategory = 
  | 'gratitude' 
  | 'reflection' 
  | 'emotional_checkin' 
  | 'morning_intentions' 
  | 'self_discovery' 
  | 'creative';

export const PROMPT_CATEGORIES: { id: PromptCategory; label: string; description: string }[] = [
  { id: 'gratitude', label: 'Gratitude', description: 'Focus on what you appreciate' },
  { id: 'reflection', label: 'Reflection', description: 'Look back on experiences' },
  { id: 'emotional_checkin', label: 'Emotional Check-in', description: 'Explore how you feel' },
  { id: 'morning_intentions', label: 'Morning Intentions', description: 'Set your daily focus' },
  { id: 'self_discovery', label: 'Self Discovery', description: 'Learn about yourself' },
  { id: 'creative', label: 'Creative', description: 'Spark imagination' },
];

// Prompt Library
export const PROMPTS: JournalPrompt[] = [
  // Gratitude
  {
    id: 'g1',
    category: 'gratitude',
    text: 'What are three things you\'re grateful for today?',
    example: 'I\'m grateful for my morning coffee, a supportive friend who checked in, and the sunny weather.'
  },
  {
    id: 'g2',
    category: 'gratitude',
    text: 'Who made a positive impact on your life recently?',
    example: 'My colleague helped me with a difficult project without being asked. It reminded me how valuable teamwork is.'
  },
  {
    id: 'g3',
    category: 'gratitude',
    text: 'What simple pleasure did you enjoy today?',
    example: 'I enjoyed a quiet lunch break reading my book. Those 20 minutes of peace felt like a gift.'
  },
  {
    id: 'g4',
    category: 'gratitude',
    text: 'What ability or skill are you thankful to have?',
    example: 'I\'m thankful I can cook. Making dinner for my family brings me joy and saves money.'
  },
  {
    id: 'g5',
    category: 'gratitude',
    text: 'What challenge are you grateful for because it helped you grow?',
    example: 'That difficult conversation last month was hard, but it taught me to set boundaries.'
  },

  // Reflection
  {
    id: 'r1',
    category: 'reflection',
    text: 'What was the highlight of your day?',
    example: 'The highlight was finishing a project I\'d been working on for weeks. Relief and pride.'
  },
  {
    id: 'r2',
    category: 'reflection',
    text: 'What would you do differently if you could redo today?',
    example: 'I\'d take that break earlier instead of pushing through fatigue. I wasn\'t productive anyway.'
  },
  {
    id: 'r3',
    category: 'reflection',
    text: 'What lesson did today teach you?',
    example: 'I learned that asking for help isn\'t weakness—it\'s efficiency.'
  },
  {
    id: 'r4',
    category: 'reflection',
    text: 'How did you take care of yourself today?',
    example: 'I went for a short walk at lunch and drank more water than usual.'
  },
  {
    id: 'r5',
    category: 'reflection',
    text: 'What conversation or interaction stands out from today?',
    example: 'A stranger smiled at me on the train. Such a small thing, but it lifted my mood.'
  },

  // Emotional Check-in
  {
    id: 'e1',
    category: 'emotional_checkin',
    text: 'How are you really feeling right now? Be honest.',
    example: 'Honestly, I\'m anxious about tomorrow\'s meeting. My chest feels tight when I think about it.'
  },
  {
    id: 'e2',
    category: 'emotional_checkin',
    text: 'What emotion has been most present today?',
    example: 'Frustration. Things didn\'t go as planned and I felt out of control.'
  },
  {
    id: 'e3',
    category: 'emotional_checkin',
    text: 'Is there something you\'ve been avoiding feeling?',
    example: 'I\'ve been avoiding sadness about my friend moving away. Writing this, I realize I miss them.'
  },
  {
    id: 'e4',
    category: 'emotional_checkin',
    text: 'What do you need right now that you\'re not getting?',
    example: 'I need rest. Real rest, not just sitting while scrolling my phone.'
  },
  {
    id: 'e5',
    category: 'emotional_checkin',
    text: 'What triggered your strongest emotion today?',
    example: 'An email from my boss triggered stress. I immediately assumed the worst.'
  },

  // Morning Intentions
  {
    id: 'm1',
    category: 'morning_intentions',
    text: 'What is your main focus for today?',
    example: 'My main focus is completing the proposal draft. Everything else is secondary.'
  },
  {
    id: 'm2',
    category: 'morning_intentions',
    text: 'How do you want to feel by the end of today?',
    example: 'I want to feel accomplished and calm. That means I need to prioritize and say no to distractions.'
  },
  {
    id: 'm3',
    category: 'morning_intentions',
    text: 'What one thing would make today successful?',
    example: 'Having a meaningful conversation with my partner. We\'ve both been so busy.'
  },
  {
    id: 'm4',
    category: 'morning_intentions',
    text: 'What potential obstacle might you face today, and how will you handle it?',
    example: 'I might get pulled into unnecessary meetings. I\'ll decline politely if they\'re not essential.'
  },
  {
    id: 'm5',
    category: 'morning_intentions',
    text: 'What kind word or encouragement do you need to hear today?',
    example: 'You\'re doing your best, and that\'s enough. Progress matters more than perfection.'
  },

  // Self Discovery
  {
    id: 's1',
    category: 'self_discovery',
    text: 'What do you value most in life right now?',
    example: 'Health and freedom. Without those, nothing else matters much.'
  },
  {
    id: 's2',
    category: 'self_discovery',
    text: 'What would your ideal day look like?',
    example: 'Wake without an alarm, coffee on the patio, creative work, lunch with friends, evening walk.'
  },
  {
    id: 's3',
    category: 'self_discovery',
    text: 'What belief about yourself would you like to let go of?',
    example: 'The belief that I\'m not creative. I\'ve been telling myself that since childhood.'
  },
  {
    id: 's4',
    category: 'self_discovery',
    text: 'What are you most proud of about yourself?',
    example: 'I\'m proud that I keep trying even when things are hard. I don\'t give up easily.'
  },
  {
    id: 's5',
    category: 'self_discovery',
    text: 'What does success mean to you personally?',
    example: 'Success means having time for what matters and not feeling constantly stressed.'
  },

  // Creative
  {
    id: 'c1',
    category: 'creative',
    text: 'If today were a chapter in your autobiography, what would you title it?',
    example: 'The Day I Almost Gave Up (But Didn\'t)'
  },
  {
    id: 'c2',
    category: 'creative',
    text: 'Describe your current mood as a weather pattern.',
    example: 'Partly cloudy with occasional sun breaks. There\'s a chance of afternoon storms.'
  },
  {
    id: 'c3',
    category: 'creative',
    text: 'Write a letter to your future self one year from now.',
    example: 'Dear Future Me, I hope you followed through on the changes we talked about...'
  },
  {
    id: 'c4',
    category: 'creative',
    text: 'If you could have dinner with anyone, living or dead, who and why?',
    example: 'My grandmother. I have so many questions I never got to ask her.'
  },
  {
    id: 'c5',
    category: 'creative',
    text: 'What would you create if you knew you couldn\'t fail?',
    example: 'I\'d write a novel. The fear of it being bad has stopped me for years.'
  },
];

// Get prompts by category
export function getPromptsByCategory(category: PromptCategory): JournalPrompt[] {
  return PROMPTS.filter(p => p.category === category);
}

// Get a random prompt from a specific category
export function getRandomPromptFromCategory(category: PromptCategory): JournalPrompt {
  const categoryPrompts = getPromptsByCategory(category);
  return categoryPrompts[Math.floor(Math.random() * categoryPrompts.length)];
}

// Get a completely random prompt (surprise me)
export function getRandomPrompt(): JournalPrompt {
  return PROMPTS[Math.floor(Math.random() * PROMPTS.length)];
}

// Get the daily prompt based on date (rotates through categories)
export function getDailyPrompt(date: Date = new Date()): JournalPrompt {
  const dayOfYear = Math.floor(
    (date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000
  );
  
  // Rotate through categories
  const categoryIndex = dayOfYear % PROMPT_CATEGORIES.length;
  const category = PROMPT_CATEGORIES[categoryIndex].id;
  
  // Get prompts for that category and pick based on day
  const categoryPrompts = getPromptsByCategory(category);
  const promptIndex = Math.floor(dayOfYear / PROMPT_CATEGORIES.length) % categoryPrompts.length;
  
  return categoryPrompts[promptIndex];
}

// Activity tags for emotion tracking
export const ACTIVITY_TAGS = [
  { id: 'work', label: 'Work', icon: '💼' },
  { id: 'exercise', label: 'Exercise', icon: '🏃' },
  { id: 'social', label: 'Social', icon: '👥' },
  { id: 'family', label: 'Family', icon: '👨‍👩‍👧' },
  { id: 'creative', label: 'Creative', icon: '🎨' },
  { id: 'learning', label: 'Learning', icon: '📚' },
  { id: 'rest', label: 'Rest', icon: '😴' },
  { id: 'nature', label: 'Nature', icon: '🌿' },
  { id: 'travel', label: 'Travel', icon: '✈️' },
  { id: 'health', label: 'Health', icon: '❤️' },
];

// Mood options with more granularity
export const MOOD_OPTIONS = [
  { value: 1, label: 'Very Low', color: '#e53e3e' },
  { value: 2, label: 'Low', color: '#dd6b20' },
  { value: 3, label: 'Neutral', color: '#d69e2e' },
  { value: 4, label: 'Good', color: '#38a169' },
  { value: 5, label: 'Great', color: '#3182ce' },
];
