import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const { scenario, count = 1, category, includeTranslations = true } = await req.json();
  
  // Default scenario if none provided
  const contextScenario = scenario || "You as a guy wanting to say a good pick up line on a girl you are talking for the first time to get her number or social info";
  
  try {
    const apiKey = process.env.OPENROUTER_API_KEY?.trim().replace(/^["']|["']$/g, '');
    console.log('API Key exists:', !!apiKey);
    console.log('API Key prefix:', apiKey ? apiKey.substring(0, 5) + '...' : 'none');
    console.log('API Key length:', apiKey ? apiKey.length : 0);
    
    if (!apiKey) {
      throw new Error('OPENROUTER_API_KEY is not set');
    }
    
    // Remove validation entirely to avoid any potential issues
    // We'll let the OpenRouter API validate the key instead
    /* 
    if (!apiKey.includes('sk-or')) {
      console.log('API Key format issue - does not contain sk-or');
      throw new Error('Invalid OpenRouter API key format. Key should contain sk-or');
    }
    */

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

    try {
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

      console.log('OpenRouter API response status:', response.status);
      console.log('OpenRouter API response headers:', JSON.stringify(Object.fromEntries([...response.headers.entries()])));
      
      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { rawText: errorText };
        }
        
        console.error('OpenRouter API Error:', {
          status: response.status,
          data: errorData,
          apiKeyPrefix: apiKey.substring(0, 5) + '...',
          apiKeyLength: apiKey.length
        });
        throw new Error(`API request failed with status ${response.status}: ${JSON.stringify(errorData)}`);
      }

      const data = await response.json();
      console.log('OpenRouter API response received successfully');
      
      if (!data.choices?.[0]?.message?.content) {
        console.error('Invalid response format from OpenRouter API:', data);
        throw new Error('Invalid response format from API');
      }
      
      // Process the response based on whether translations are included
      const content = data.choices[0].message.content;
      console.log('Raw API response content:', content);
      
      let lines: { tagalog: string, translation: string }[] = [];
      if (includeTranslations) {
        try {
          const jsonLines = processJsonResponse(content, lineCount);
          // If processJsonResponse returns undefined or empty array, fall back to text processing
          if (!jsonLines || jsonLines.length === 0) {
            console.log('JSON processing failed, falling back to text processing');
            const textLines = processPickupLines(content, lineCount);
            lines = textLines.map(line => ({ tagalog: line, translation: '' }));
          } else {
            lines = jsonLines;
          }
        } catch (error) {
          console.error('Error in JSON processing:', error instanceof Error ? error.message : 'Unknown error');
          const textLines = processPickupLines(content, lineCount);
          lines = textLines.map(line => ({ tagalog: line, translation: '' }));
        }
      } else {
        const textLines = processPickupLines(content, lineCount);
        lines = textLines.map(line => ({ tagalog: line, translation: '' }));
      }
      
      // Ensure lines is always an array
      if (!Array.isArray(lines)) {
        console.error('Lines is not an array:', lines);
        lines = [];
      }
      
      console.log('Processed lines:', lines);
      
      return NextResponse.json({ lines });
    } catch (error) {
      console.error('Error generating response:', error instanceof Error ? error.message : 'Unknown error');
      
      // Provide fallback pickup lines if the API fails
      console.log('Checking for 502 error condition:', JSON.stringify(error));
      
      // Check for 502 error in various ways
      const errorStr = JSON.stringify(error);
      const is502Error = 
        (error instanceof Error && error.message.includes('502')) || 
        errorStr.includes('502') || 
        errorStr.includes('Bad Gateway') ||
        (typeof error === 'object' && error !== null && 'status' in error && error.status === 502);
      
      if (is502Error || errorStr.includes('unknown error')) {
        console.log('Using fallback pickup lines due to API error');
        const fallbackLines = [
          {
            tagalog: "Pwede ba kitang tawaging Google? Kasi lagi kang may sagot sa mga hinahanap ko.",
            translation: "Can I call you Google? Because you always have the answer to what I'm looking for."
          },
          {
            tagalog: "Ikaw ba ay isang kape? Kasi hindi ako makatulog kakaisip sayo.",
            translation: "Are you coffee? Because I can't sleep thinking about you."
          },
          {
            tagalog: "Pwede ba kitang tawaging WiFi? Kasi ramdam ko ang connection natin.",
            translation: "Can I call you WiFi? Because I feel our connection."
          },
          {
            tagalog: "Ikaw ba ay isang camera? Kasi sa tuwing nakikita kita, napapangiti ako.",
            translation: "Are you a camera? Because every time I see you, I smile."
          },
          {
            tagalog: "Pwede ba kitang tawaging keyboard? Kasi ikaw ang type ko.",
            translation: "Can I call you a keyboard? Because you're just my type."
          }
        ];
        
        // Return a subset of the fallback lines based on the requested count
        return NextResponse.json({ 
          lines: fallbackLines.slice(0, Math.min(lineCount, fallbackLines.length)),
          note: "Using fallback pickup lines due to API issues. Please try again later."
        });
      }
      
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Failed to generate response' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error generating response:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate response' },
      { status: 500 }
    );
  }
}

// Process JSON response with tagalog and translation fields
function processJsonResponse(content: string, expectedCount: number): { tagalog: string, translation: string }[] {
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
    // If parsed is not an array, return an empty array
    return [];
  } catch (error) {
    console.error('Error parsing JSON response:', error instanceof Error ? error.message : 'Unknown error');
    // Fall back to regular processing if JSON parsing fails
  }
  
  // If JSON parsing fails, try to extract pairs of lines
  const lines = content.split('\n').filter(line => line.trim());
  const result: { tagalog: string, translation: string }[] = [];
  
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
