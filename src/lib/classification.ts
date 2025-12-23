import { TaskCategory, TaskPriority, ExtractedEntities, ClassificationResult } from '@/types/task';

// Keyword mappings for category classification
const categoryKeywords: Record<TaskCategory, string[]> = {
  scheduling: ['meeting', 'schedule', 'call', 'appointment', 'deadline', 'calendar', 'event', 'reminder', 'agenda'],
  finance: ['payment', 'invoice', 'bill', 'budget', 'cost', 'expense', 'money', 'price', 'financial', 'revenue'],
  technical: ['bug', 'fix', 'error', 'install', 'repair', 'maintain', 'update', 'deploy', 'code', 'system', 'server'],
  safety: ['safety', 'hazard', 'inspection', 'compliance', 'ppe', 'risk', 'emergency', 'warning', 'secure'],
  general: [],
};

// Priority keywords
const priorityKeywords: Record<TaskPriority, string[]> = {
  high: ['urgent', 'asap', 'immediately', 'today', 'critical', 'emergency', 'now', 'priority', 'important'],
  medium: ['soon', 'this week', 'important', 'needed', 'should'],
  low: ['whenever', 'low priority', 'eventually', 'later', 'someday'],
};

// Suggested actions per category
const suggestedActions: Record<TaskCategory, string[]> = {
  scheduling: ['Block calendar', 'Send invite', 'Prepare agenda', 'Set reminder'],
  finance: ['Check budget', 'Get approval', 'Generate invoice', 'Update records'],
  technical: ['Diagnose issue', 'Check resources', 'Assign technician', 'Document fix'],
  safety: ['Conduct inspection', 'File report', 'Notify supervisor', 'Update checklist'],
  general: ['Review requirements', 'Assign team member', 'Set deadline', 'Create subtasks'],
};

// Date patterns for extraction
const datePatterns = [
  /\b(today|tomorrow|yesterday)\b/gi,
  /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/gi,
  /\b\d{1,2}\/\d{1,2}(\/\d{2,4})?\b/g,
  /\b\d{1,2}-\d{1,2}(-\d{2,4})?\b/g,
  /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]* \d{1,2}(,? \d{4})?\b/gi,
  /\bthis (week|month|year)\b/gi,
  /\bnext (week|month|monday|tuesday|wednesday|thursday|friday)\b/gi,
];

// Person extraction patterns
const personPatterns = [
  /(?:with|by|assign(?:ed)? to|contact|notify|tell|inform|call)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/g,
  /@(\w+)/g,
];

// Location patterns
const locationPatterns = [
  /(?:at|in|to|from|room|office|building|site)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g,
  /(?:room|office|building|site)\s+([A-Za-z0-9]+)/gi,
];

// Action verb patterns
const actionVerbPatterns = [
  /\b(schedule|create|review|complete|send|call|email|update|fix|check|prepare|submit|approve|cancel|organize|setup|plan|meet|discuss|analyze|implement|deploy)\b/gi,
];

function extractDates(text: string): string[] {
  const dates = new Set<string>();
  datePatterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) {
      matches.forEach(match => dates.add(match.toLowerCase()));
    }
  });
  return Array.from(dates);
}

function extractPeople(text: string): string[] {
  const people = new Set<string>();
  personPatterns.forEach(pattern => {
    let match;
    const regex = new RegExp(pattern.source, pattern.flags);
    while ((match = regex.exec(text)) !== null) {
      if (match[1]) {
        people.add(match[1].trim());
      }
    }
  });
  return Array.from(people);
}

function extractLocations(text: string): string[] {
  const locations = new Set<string>();
  locationPatterns.forEach(pattern => {
    let match;
    const regex = new RegExp(pattern.source, pattern.flags);
    while ((match = regex.exec(text)) !== null) {
      if (match[1]) {
        locations.add(match[1].trim());
      }
    }
  });
  return Array.from(locations);
}

function extractActionVerbs(text: string): string[] {
  const verbs = new Set<string>();
  actionVerbPatterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) {
      matches.forEach(match => verbs.add(match.toLowerCase()));
    }
  });
  return Array.from(verbs);
}

function classifyCategory(text: string): TaskCategory {
  const lowerText = text.toLowerCase();
  let maxScore = 0;
  let bestCategory: TaskCategory = 'general';

  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    if (category === 'general') continue;
    
    let score = 0;
    for (const keyword of keywords) {
      if (lowerText.includes(keyword)) {
        score++;
      }
    }
    
    if (score > maxScore) {
      maxScore = score;
      bestCategory = category as TaskCategory;
    }
  }

  return bestCategory;
}

function classifyPriority(text: string): TaskPriority {
  const lowerText = text.toLowerCase();

  // Check high priority first
  for (const keyword of priorityKeywords.high) {
    if (lowerText.includes(keyword)) {
      return 'high';
    }
  }

  // Check medium priority
  for (const keyword of priorityKeywords.medium) {
    if (lowerText.includes(keyword)) {
      return 'medium';
    }
  }

  // Default to low
  return 'low';
}

export function classifyTask(title: string, description: string): ClassificationResult {
  const fullText = `${title} ${description}`;
  
  const category = classifyCategory(fullText);
  const priority = classifyPriority(fullText);
  
  const extracted_entities: ExtractedEntities = {
    dates: extractDates(fullText),
    people: extractPeople(fullText),
    locations: extractLocations(fullText),
    actionVerbs: extractActionVerbs(fullText),
  };

  return {
    category,
    priority,
    extracted_entities,
    suggested_actions: suggestedActions[category],
  };
}

// Unit tests for classification logic
export function runClassificationTests(): { passed: number; failed: number; results: string[] } {
  const tests = [
    {
      name: 'Scheduling category detection',
      input: { title: 'Schedule meeting with team', description: 'Discuss project updates' },
      expected: { category: 'scheduling' as TaskCategory },
    },
    {
      name: 'Finance category detection',
      input: { title: 'Review invoice', description: 'Check the budget allocation for Q4' },
      expected: { category: 'finance' as TaskCategory },
    },
    {
      name: 'High priority detection',
      input: { title: 'Urgent fix needed', description: 'Critical bug in production' },
      expected: { priority: 'high' as TaskPriority },
    },
    {
      name: 'Technical category detection',
      input: { title: 'Fix server error', description: 'Deploy hotfix to production' },
      expected: { category: 'technical' as TaskCategory },
    },
    {
      name: 'Safety category detection',
      input: { title: 'Safety inspection required', description: 'Check compliance with PPE regulations' },
      expected: { category: 'safety' as TaskCategory },
    },
  ];

  let passed = 0;
  let failed = 0;
  const results: string[] = [];

  tests.forEach(test => {
    const result = classifyTask(test.input.title, test.input.description);
    const expectedCategory = test.expected.category;
    const expectedPriority = test.expected.priority;

    let testPassed = true;
    if (expectedCategory && result.category !== expectedCategory) {
      testPassed = false;
    }
    if (expectedPriority && result.priority !== expectedPriority) {
      testPassed = false;
    }

    if (testPassed) {
      passed++;
      results.push(`✓ ${test.name}`);
    } else {
      failed++;
      results.push(`✗ ${test.name} - Expected: ${JSON.stringify(test.expected)}, Got: category=${result.category}, priority=${result.priority}`);
    }
  });

  return { passed, failed, results };
}
