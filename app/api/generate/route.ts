import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const { scenario, count = 1, category, includeTranslations = true } = await req.json();
  
  // Default scenario if none provided
  const contextScenario = scenario || "You as a guy wanting to say a good pick up line on a girl you are talking for the first time to get her number or social info";
  
  try {
    const apiKey = process.env.OPENROUTER_API_KEY?.trim().replace(/^["']|["']$/g, '');
    if (!apiKey) {
      throw new Error('OPENROUTER_API_KEY is not set');
    }
    if (!apiKey.startsWith('sk-or-')) {
      throw new Error('Invalid OpenRouter API key format. Key should start with sk-or-');
    }

    const lineCount = Math.min(Math.max(1, Number(count)), 20); // Limit between 1 and 20

    // Adjust prompt based on category
    let categoryPrompt = '';
    if (category) {
      switch (category) {
        case 'romantic':
          categoryPrompt = 'Make these romantic, sweet, and heartfelt. Focus on emotions and genuine connection.';
          break;
        case 'funny':
          categoryPrompt = 'Make these humorous and witty. Focus on clever wordplay and jokes that will make them laugh.';
          break;
        case 'naughty':
          categoryPrompt = 'Make these playful and flirty with subtle innuendos. Be suggestive but not explicit or vulgar.';
          break;
      }
    }

    // Build the prompt with translation instructions
    const translationInstructions = includeTranslations 
      ? "For each pickup line, also provide an English translation. Format your response as a JSON array with each item having 'tagalog' and 'translation' fields."
      : "Format your response as a numbered list from 1 to " + lineCount + ".";

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}`,
        'X-Title': 'Tagalog Rizz Chat'
      },
      body: JSON.stringify({
        model: 'deepseek/deepseek-chat:free',
        messages: [{
          role: 'user',
          content: `Scenario: ${contextScenario}\n\nGenerate ${lineCount} creative tagalog pick-up lines. ${categoryPrompt} ${translationInstructions}`
        }]
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('OpenRouter API Error:', {
        status: response.status,
        data: errorData,
        apiKeyPrefix: apiKey.substring(0, 6) + '...'
      });
      throw new Error(`API request failed with status ${response.status}: ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    if (!data.choices?.[0]?.message?.content) {
      throw new Error('Invalid response format from API');
    }
    
    // Process the response based on whether translations are included
    const content = data.choices[0].message.content;
    console.log('Raw API response content:', content);
    
    let lines;
    if (includeTranslations) {
      lines = processJsonResponse(content, lineCount);
    } else {
      lines = processPickupLines(content, lineCount);
    }
    
    console.log('Processed lines:', lines);
    
    return NextResponse.json({ lines });
  } catch (error) {
    console.error('Error generating response:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate response' },
      { status: 500 }
    );
  }
}

// Process JSON response with tagalog and translation fields
function processJsonResponse(content: string, expectedCount: number) {
  try {
    // Try to extract JSON from the content (in case there's extra text)
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    const jsonContent = jsonMatch ? jsonMatch[0] : content;
    
    // Parse the JSON
    const parsed = JSON.parse(jsonContent);
    
    // Validate and format the response
    if (Array.isArray(parsed)) {
      return parsed.slice(0, expectedCount).map(item => {
        // Handle different possible formats
        if (typeof item === 'object') {
          return {
            tagalog: item.tagalog || item.text || item.content || item.line || '',
            translation: item.translation || item.english || item.meaning || ''
          };
        } else if (typeof item === 'string') {
          // If it's just a string, assume it's tagalog with no translation
          return { tagalog: item, translation: '' };
        }
        return { tagalog: '', translation: '' };
      });
    }
  } catch (error) {
    console.error('Error parsing JSON response:', error);
    // Fall back to regular processing if JSON parsing fails
  }
  
  // If JSON parsing fails, try to extract pairs of lines
  const lines = content.split('\n').filter(line => line.trim());
  const result = [];
  
  for (let i = 0; i < lines.length && result.length < expectedCount; i++) {
    const line = lines[i].trim();
    // Skip empty lines and lines that look like headers or separators
    if (!line || line.match(/^[-=*]+$/) || line.match(/^(tagalog|translation|english):/i)) {
      continue;
    }
    
    // Check if this line has a number prefix (like "1." or "1)")
    const isNumbered = line.match(/^\d+[\.\)]/);
    
    // If it's a numbered line and there's a next line, treat them as a pair
    if (isNumbered && i + 1 < lines.length) {
      const tagalog = line.replace(/^\d+[\.\)]\s*/, '').trim();
      const translation = lines[i + 1].replace(/^\d+[\.\)]\s*/, '').trim();
      
      result.push({
        tagalog,
        translation: translation.startsWith('*') && translation.endsWith('*') 
          ? translation.substring(1, translation.length - 1) 
          : translation
      });
      
      // Skip the next line since we've used it as translation
      i++;
    } else {
      // If it's just a single line, use it as tagalog with no translation
      result.push({
        tagalog: line.replace(/^\d+[\.\)]\s*/, '').trim(),
        translation: ''
      });
    }
  }
  
  return result.slice(0, expectedCount);
}

// Helper function to process the response into individual pickup lines
function processPickupLines(content: string, expectedCount: number): string[] {
  console.log(`Processing pickup lines, expecting ${expectedCount} lines`);
  
  // Try to extract numbered lines (1. Line one, 2. Line two, etc.)
  const numberedLineRegex = /\d+[\.\)]\s*(.*?)(?=\n\d+[\.\)]|\n*$)/g;
  const matches = Array.from(content.matchAll(numberedLineRegex)).map(match => match[1].trim());
  
  console.log(`Found ${matches.length} lines using numbered regex`);
  
  if (matches.length > 0) {
    return matches;
  }
  
  // Fallback: split by newlines and filter empty lines
  let lines = content.split('\n').map(line => {
    // Remove any numbering at the start of the line
    return line.replace(/^\d+[\.\)]\s*/, '').trim();
  }).filter(line => line.length > 0);
  
  console.log(`Found ${lines.length} lines after splitting by newlines`);
  
  // If we still don't have enough lines, try to split by double newlines
  if (lines.length < expectedCount) {
    lines = content.split('\n\n').map(line => {
      // Remove any numbering at the start of the line
      return line.replace(/^\d+[\.\)]\s*/, '').trim();
    }).filter(line => line.length > 0);
    console.log(`Found ${lines.length} lines after splitting by double newlines`);
  }
  
  // If we still don't have enough lines and the content is long enough,
  // try to split the content into roughly equal parts
  if (lines.length < expectedCount && content.length > expectedCount * 20) {
    console.log('Attempting to split content into equal parts');
    const avgLength = Math.floor(content.length / expectedCount);
    lines = [];
    for (let i = 0; i < expectedCount; i++) {
      const start = i * avgLength;
      const end = (i + 1) * avgLength;
      const part = content.substring(start, end).trim();
      if (part) lines.push(part);
    }
    console.log(`Found ${lines.length} lines after splitting into equal parts`);
  }
  
  return lines.slice(0, expectedCount);
}
