import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dbPath = path.join(process.cwd(), 'data', 'impromptu.db');

// Ensure data directory exists
const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(dbPath);

// Create table if not exists
db.exec(`
  CREATE TABLE IF NOT EXISTS questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    level TEXT NOT NULL CHECK(level IN ('L1', 'L2', 'L3', 'L4', 'L5')),
    text TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Sample questions for each level
const sampleQuestions = {
  L1: [
    'What is your favorite food and why?',
    'Describe your best friend.',
    'What did you do last weekend?',
    'What is your favorite animal?',
    'Tell us about your family.',
    'What is your favorite color and why?',
    'Describe your home.',
    'What do you like to do for fun?',
  ],
  L2: [
    'If you could have any superpower, what would it be?',
    'Describe your ideal vacation.',
    'What would you do if you won the lottery?',
    'Tell us about a memorable experience.',
    'What is the best gift you have ever received?',
    'If you could meet anyone, who would it be?',
    'Describe your favorite holiday.',
    'What makes a good friend?',
  ],
  L3: [
    'Should students wear school uniforms? Why or why not?',
    'What are the advantages and disadvantages of social media?',
    'How can we protect the environment?',
    'Is it better to live in a city or the countryside?',
    'What qualities make a good leader?',
    'How has technology changed education?',
    'What are the benefits of learning a second language?',
    'Should homework be banned?',
  ],
  L4: [
    'Discuss the impact of artificial intelligence on employment.',
    'How should governments address climate change?',
    'What role should social media play in democracy?',
    'Discuss the ethics of genetic engineering.',
    'How can we balance economic growth with environmental protection?',
    'What are the pros and cons of globalization?',
    'Should there be limits on free speech?',
    'How can we reduce inequality in society?',
  ],
  L5: [
    'Analyze the relationship between individual freedom and collective responsibility.',
    'To what extent should governments intervene in the economy?',
    'Discuss the philosophical implications of artificial consciousness.',
    'How should society balance security and privacy?',
    'Evaluate the effectiveness of international organizations in solving global problems.',
    'What ethical frameworks should guide biotechnology research?',
    'Discuss the future of work in an automated world.',
    'How can democratic institutions adapt to technological change?',
  ],
};

// Clear existing questions
db.exec('DELETE FROM questions');

// Insert sample questions
const insert = db.prepare('INSERT INTO questions (level, text) VALUES (?, ?)');

for (const [level, questions] of Object.entries(sampleQuestions)) {
  for (const text of questions) {
    insert.run(level, text);
  }
}

console.log('Database seeded successfully!');
console.log('Inserted questions per level:');
for (const level of ['L1', 'L2', 'L3', 'L4', 'L5']) {
  const count = db.prepare('SELECT COUNT(*) as count FROM questions WHERE level = ?').get(level) as { count: number };
  console.log(`  ${level}: ${count.count} questions`);
}

db.close();
