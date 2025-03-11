// Netlify Function to act as a proxy for OpenRouter API
exports.handler = async function(event, context) {
  try {
    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        body: JSON.stringify({ error: 'Method Not Allowed' }),
        headers: { 'Content-Type': 'application/json' }
      };
    }

    // Parse the request body
    const requestBody = JSON.parse(event.body || '{}');
    const { scenario, count = 1, category, includeTranslations = true } = requestBody;
    
    // Default scenario if none provided
    const contextScenario = scenario || "You as a guy wanting to say a good pick up line on a girl you are talking for the first time to get her number or social info";
    
    // Get the API key from environment variables
    const apiKey = process.env.OPENROUTER_API_KEY?.trim();
    console.log('API Key exists:', !!apiKey);
    console.log('API Key prefix:', apiKey ? apiKey.substring(0, 5) + '...' : 'none');
    console.log('API Key length:', apiKey ? apiKey.length : 0);
    
    if (!apiKey) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'OPENROUTER_API_KEY is not set' }),
        headers: { 'Content-Type': 'application/json' }
      };
    }

    // Build category prompt
    const categoryPrompt = category && category !== 'any' 
      ? `Make it ${category.toLowerCase()}.` 
      : '';
    
    // Build the prompt with translation instructions
    const translationInstructions = includeTranslations 
      ? "For each pickup line, also provide an English translation. Format your response as a JSON array with each item having 'tagalog' and 'translation' fields."
      : "Format your response as a numbered list from 1 to " + count + ".";

    // Make the request to OpenRouter API
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
          content: `Scenario: ${contextScenario}\n\nGenerate ${count} creative tagalog pick-up lines. ${categoryPrompt} ${translationInstructions}`
        }]
      }),
    });

    console.log('OpenRouter API response status:', response.status);
    
    // Handle API errors
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
      
      // If there's an error, use fallback pickup lines
      if (response.status === 502 || errorText.includes('unknown error')) {
        return provideFallbackLines(count);
      }
      
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: `API request failed with status ${response.status}` }),
        headers: { 'Content-Type': 'application/json' }
      };
    }

    // Process the successful response
    const data = await response.json();
    
    if (!data.choices?.[0]?.message?.content) {
      console.error('Invalid response format from OpenRouter API:', data);
      return provideFallbackLines(count);
    }
    
    // Process the response content
    const content = data.choices[0].message.content;
    console.log('Raw API response content:', content);
    
    let lines = [];
    if (includeTranslations) {
      try {
        const jsonLines = processJsonResponse(content, count);
        // If processJsonResponse returns undefined or empty array, fall back to text processing
        if (!jsonLines || jsonLines.length === 0) {
          console.log('JSON processing failed, falling back to text processing');
          const textLines = processPickupLines(content, count);
          lines = textLines.map(line => ({ tagalog: line, translation: '' }));
        } else {
          lines = jsonLines;
        }
      } catch (error) {
        console.error('Error in JSON processing:', error instanceof Error ? error.message : 'Unknown error');
        const textLines = processPickupLines(content, count);
        lines = textLines.map(line => ({ tagalog: line, translation: '' }));
      }
    } else {
      const textLines = processPickupLines(content, count);
      lines = textLines.map(line => ({ tagalog: line, translation: '' }));
    }
    
    // Ensure lines is always an array
    if (!Array.isArray(lines)) {
      console.error('Lines is not an array:', lines);
      lines = [];
    }
    
    console.log('Processed lines:', lines);
    
    return {
      statusCode: 200,
      body: JSON.stringify({ lines }),
      headers: { 'Content-Type': 'application/json' }
    };
    
  } catch (error) {
    console.error('Error generating response:', error instanceof Error ? error.message : 'Unknown error');
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to generate response' }),
      headers: { 'Content-Type': 'application/json' }
    };
  }
};

// Function to provide fallback pickup lines
function provideFallbackLines(count) {
  console.log('Using fallback pickup lines');
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
  return {
    statusCode: 200,
    body: JSON.stringify({ 
      lines: fallbackLines.slice(0, Math.min(count, fallbackLines.length)),
      note: "Using fallback pickup lines due to API issues. Please try again later."
    }),
    headers: { 'Content-Type': 'application/json' }
  };
}

// Process pickup lines from text response
function processPickupLines(content, count) {
  // Split by newlines and filter out empty lines
  let lines = content.split('\n').filter(line => line.trim() !== '');
  
  // Remove any numbering or bullet points
  lines = lines.map(line => {
    // Remove numbering (e.g., "1.", "2.", etc.)
    return line.replace(/^\d+[\.\)]\s*/, '')
      // Remove bullet points
      .replace(/^[-•*]\s*/, '')
      // Trim whitespace
      .trim();
  });
  
  // Filter out any lines that are too short (likely not pickup lines)
  lines = lines.filter(line => line.length > 5);
  
  // Limit to the requested count
  return lines.slice(0, count);
}

// Process JSON response for pickup lines with translations
function processJsonResponse(content, count) {
  try {
    // Try to extract JSON from the content
    let jsonContent = content;
    
    // If content is wrapped in backticks, extract it
    const jsonMatch = content.match(/```(?:json)?([\s\S]*?)```/);
    if (jsonMatch && jsonMatch[1]) {
      jsonContent = jsonMatch[1].trim();
    }
    
    // Parse the JSON
    let parsed;
    try {
      parsed = JSON.parse(jsonContent);
    } catch (e) {
      // If direct parsing fails, try to find an array in the text
      const arrayMatch = content.match(/\[\s*\{[\s\S]*\}\s*\]/);
      if (arrayMatch) {
        parsed = JSON.parse(arrayMatch[0]);
      } else {
        throw new Error('Failed to parse JSON');
      }
    }
    
    // Handle different JSON formats
    if (Array.isArray(parsed)) {
      // Format: [{tagalog: "...", translation: "..."}, ...]
      return parsed.slice(0, count).map(item => ({
        tagalog: item.tagalog || item.Tagalog || '',
        translation: item.translation || item.Translation || item.english || item.English || ''
      }));
    } else if (parsed && typeof parsed === 'object') {
      // Format: {1: {tagalog: "...", translation: "..."}, ...}
      const lines = [];
      for (const key in parsed) {
        if (lines.length >= count) break;
        const item = parsed[key];
        if (item && typeof item === 'object') {
          lines.push({
            tagalog: item.tagalog || item.Tagalog || '',
            translation: item.translation || item.Translation || item.english || item.English || ''
          });
        }
      }
      return lines;
    }
    // If parsed is not an array, return an empty array
    return [];
  } catch (error) {
    console.error('Error parsing JSON response:', error instanceof Error ? error.message : 'Unknown error');
    // Fall back to regular processing if JSON parsing fails
  }
  
  return [];
}
