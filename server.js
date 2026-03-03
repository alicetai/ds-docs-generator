// Local proxy server — keeps the OpenAI API key out of the plugin UI
// Run with: npm run server
// Requires a .env file with OPENAI_API_KEY=sk-...

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

const PORT = process.env.PORT || 3001;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const CACHE_FILE = path.join(__dirname, '.cache.json');

// Load persisted cache from disk, or start fresh
let cache = {};
try { cache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8')); } catch (_) {}

app.post('/generate', async (req, res) => {
  const { componentName } = req.body;

  if (!componentName) {
    return res.status(400).json({ error: 'componentName is required.' });
  }

  // Return cached result if available
  if (cache[componentName]) {
    return res.json(cache[componentName]);
  }

  if (!OPENAI_API_KEY) {
    return res.status(500).json({ error: 'OPENAI_API_KEY is not set. Add it to your .env file.' });
  }

  const prompt =
    'You are a design systems expert with decades of experience working with well-known design systems such as IBM Carbon, Material Design, Salesforce Lightning, and Atlassian Design System. Generate concise documentation for the "' + componentName + '" UI component. Write in plain English. Be direct. No jargon. No filler.\n\n' +
    'Return a JSON object with these exact keys. All values must be plain strings (no markdown, no bullet points):\n' +
    '"introduction": 2-3 sentences describing the component and its role in the design system.\n' +
    '"whenToUse": 2-3 sentences on when to use this component.\n' +
    '"whenNotToUse": 2-3 sentences on when to avoid this component.\n' +
    '"contentAndMessaging": 2-3 sentences on copy and text guidelines.\n' +
    '"alignmentAndGrouping": 2-3 sentences on layout, spacing, and grid usage.\n' +
    '"interactions": 2-3 sentences on required interactive states (hover, focus, active, disabled).\n' +
    '"accessibility": 2-3 sentences on WCAG compliance and screen reader behaviour.\n' +
    '"desktop": 2-3 sentences on behaviour and sizing at desktop viewports (≥1024px).\n' +
    '"mobile": 2-3 sentences on behaviour and sizing at mobile viewports (<768px).';

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + OPENAI_API_KEY,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        response_format: { type: 'json_object' },
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return res.status(response.status).json({ error: (err.error && err.error.message) || 'OpenAI API error.' });
    }

    const data = await response.json();
    const content = JSON.parse(data.choices[0].message.content);

    // Store in memory and persist to disk
    cache[componentName] = content;
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));

    res.json(content);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log('DS Docs proxy running on http://localhost:' + PORT);
});
