import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const { prompt, scenario, count = 1 } = await req.json();
  
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
          content: `Scenario: ${contextScenario}\n\nGenerate ${lineCount} creative tagalog pick-up lines about: ${prompt}. Keep each under 2 sentences and use romantic taglish if appropriate. Format your response as a numbered list from 1 to ${lineCount}.`
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
    
    // Process the response to extract individual lines
    const content = data.choices[0].message.content;
    console.log('Raw API response content:', content);
    console.log('Expected line count:', lineCount);
    
    const lines = processPickupLines(content, lineCount);
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

// Helper function to process the response into individual pickup lines
function processPickupLines(content: string, expectedCount: number): string[] {
  console.log(`Processing pickup lines, expecting ${expectedCount} lines`);
  
  // Try to extract numbered lines (1. Line one, 2. Line two, etc.)
  const numberedLineRegex = /\d+[\.\)]\s*(.*?)(?=\n\d+[\.\)]|\n*$)/g;
  let matches = Array.from(content.matchAll(numberedLineRegex)).map(match => match[1].trim());
  
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
  // try to artificially split it into roughly equal parts
  if (lines.length < expectedCount && content.length > expectedCount * 20) {
    console.log('Content is long enough, attempting to split into equal parts');
    const avgLength = Math.floor(content.length / expectedCount);
    lines = [];
    
    for (let i = 0; i < expectedCount; i++) {
      const start = i * avgLength;
      const end = (i + 1) * avgLength;
      let segment = content.substring(start, end).trim();
      
      // Try to find a natural break point (period, question mark, exclamation)
      const naturalBreak = segment.search(/[.!?]/);
      if (naturalBreak > 0 && naturalBreak < segment.length - 10) {
        segment = segment.substring(0, naturalBreak + 1);
      }
      
      if (segment.length > 0) {
        lines.push(segment);
      }
    }
    console.log(`Created ${lines.length} lines by splitting content into equal parts`);
  }
  
  // If we still don't have enough lines, just return the whole content as one line
  return lines.length > 0 ? lines : [content.trim()];
}
