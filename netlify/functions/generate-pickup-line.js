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

    // Make the request to OpenRouter API with a timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout (less than Netlify's 10s limit)
    
    try {
      console.log('Making request to OpenRouter API with Gemini model');
      
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}`,
          'X-Title': 'Tagalog Rizz Chat'
        },
        body: JSON.stringify({
          model: 'google/gemini-2.0-flash-exp:free', // Using Gemini model which should be faster
          messages: [{
            role: 'user',
            content: `Scenario: ${contextScenario}\n\nGenerate ${count <= 6 ? count : 6} creative tagalog pick-up lines. ${categoryPrompt} ${translationInstructions} Keep responses brief and concise.`
          }],
          max_tokens: 300, // Limit token count to speed up response
          temperature: 0.7 // Lower temperature for more focused responses
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId); // Clear the timeout if the request completes
      
      console.log('OpenRouter API response status:', response.status);
      
      // Handle API errors
      if (!response.ok) {
        const errorText = await response.text();
        console.error('OpenRouter API Error:', {
          status: response.status,
          errorText: errorText.substring(0, 200) // Log first 200 chars of error
        });
        
        return provideFallbackLines(count);
      }
      
      // Process the successful response
      const data = await response.json();
      
      if (!data.choices?.[0]?.message?.content) {
        console.error('Invalid response format from OpenRouter API');
        return provideFallbackLines(count);
      }
      
      // Process the response content
      const content = data.choices[0].message.content;
      console.log('Raw API response content (first 100 chars):', content.substring(0, 100));
      
      // Clean up the content by removing any markdown code blocks
      const cleanedContent = content
        .replace(/^```(?:json)?\s*/g, '')  // Remove opening code block markers
        .replace(/```\s*$/g, '');          // Remove closing code block markers
      
      console.log('Cleaned content (first 100 chars):', cleanedContent.substring(0, 100));
      
      // Extract JSON from the content
      let lines = [];
      try {
        lines = extractPickupLines(cleanedContent, count <= 6 ? count : 6, includeTranslations);
        
        if (!lines || lines.length === 0) {
          console.log('Failed to extract pickup lines, using fallbacks');
          return provideFallbackLines(count);
        }
        
        return {
          statusCode: 200,
          body: JSON.stringify({ lines }),
          headers: { 'Content-Type': 'application/json' }
        };
      } catch (error) {
        console.error('Error processing response:', error);
        return provideFallbackLines(count);
      }
    } catch (error) {
      clearTimeout(timeoutId);
      console.error('Error making API request:', error instanceof Error ? error.message : 'Unknown error');
      
      // Check if it's an AbortError (timeout)
      if (error.name === 'AbortError') {
        console.log('Request timed out, using fallback pickup lines');
      }
      
      return provideFallbackLines(count);
    }
  } catch (error) {
    console.error('Error in handler:', error instanceof Error ? error.message : 'Unknown error');
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to generate response' }),
      headers: { 'Content-Type': 'application/json' }
    };
  }
};

// Extract pickup lines from API response
function extractPickupLines(content, count, includeTranslations) {
  // Clean up the content - remove any ```json prefix and trailing backticks
  content = content.replace(/^```json\s*/g, '').replace(/^```\s*/g, '').replace(/```\s*$/g, '');
  
  // Try to extract JSON from the content
  if (includeTranslations) {
    try {
      // Check for JSON in code blocks - this should be redundant now but keeping as fallback
      const jsonMatch = content.match(/```(?:json)?([\s\S]*?)```/);
      let jsonContent = jsonMatch && jsonMatch[1] ? jsonMatch[1].trim() : content;
      
      // Try to find array pattern if not in code blocks
      if (!jsonMatch) {
        const arrayMatch = content.match(/\[\s*\{[\s\S]*\}\s*\]/);
        if (arrayMatch) {
          jsonContent = arrayMatch[0];
        }
      }
      
      // Additional cleanup for common issues
      jsonContent = jsonContent.replace(/^```json\s*/g, '').replace(/^```\s*/g, '').replace(/```\s*$/g, '');
      
      // Parse the JSON
      let parsed;
      try {
        parsed = JSON.parse(jsonContent);
      } catch (e) {
        console.log('First JSON parse attempt failed:', e.message);
        // Try with additional cleanup for quotes and escaping
        jsonContent = jsonContent.replace(/(['"])?([a-zA-Z0-9_]+)(['"])?:/g, '"$2":');
        try {
          parsed = JSON.parse(jsonContent);
        } catch (e2) {
          console.log('Second JSON parse attempt failed:', e2.message);
          throw e2;
        }
      }
      
      if (Array.isArray(parsed)) {
        // Format: [{tagalog: "...", translation: "..."}, ...]
        return parsed.slice(0, count).map(item => {
          // Clean up the tagalog text to remove any "tagalog:" prefix
          let tagalogText = item.tagalog || item.Tagalog || '';
          tagalogText = tagalogText.replace(/^(?:tagalog|Tagalog):\s*/i, '').trim();
          
          return {
            tagalog: tagalogText,
            translation: item.translation || item.Translation || item.english || item.English || ''
          };
        });
      } else if (parsed && typeof parsed === 'object') {
        // Format: {1: {tagalog: "...", translation: "..."}, ...}
        const lines = [];
        for (const key in parsed) {
          if (lines.length >= count) break;
          const item = parsed[key];
          if (item && typeof item === 'object') {
            // Clean up the tagalog text to remove any "tagalog:" prefix
            let tagalogText = item.tagalog || item.Tagalog || '';
            tagalogText = tagalogText.replace(/^(?:tagalog|Tagalog):\s*/i, '').trim();
            
            lines.push({
              tagalog: tagalogText,
              translation: item.translation || item.Translation || item.english || item.English || ''
            });
          }
        }
        return lines;
      }
    } catch (error) {
      console.error('JSON parsing failed, trying text extraction');
    }
  }
  
  // Fallback to text processing if JSON parsing fails
  const lines = content.split('\n')
    .filter(line => line.trim().length > 0)
    .map(line => line.replace(/^\d+[\.\)]\s*/, '').replace(/^[-•*]\s*/, '').trim())
    .map(line => line.replace(/^(?:tagalog|Tagalog):\s*/i, '').trim())
    .filter(line => line.length > 5);
  
  // For non-JSON responses, try to pair lines (odd = tagalog, even = translation)
  if (includeTranslations && lines.length >= 2) {
    const result = [];
    for (let i = 0; i < lines.length - 1 && result.length < count; i += 2) {
      result.push({
        tagalog: lines[i],
        translation: lines[i + 1] || ''
      });
    }
    return result;
  }
  
  // If we can't pair them, just return tagalog lines
  return lines.slice(0, count).map(line => ({
    tagalog: line,
    translation: ''
  }));
}

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
    },
    {
      tagalog: "Ikaw ba ay isang libro? Kasi hindi ko maalis ang aking mga mata sa iyo.",
      translation: "Are you a book? Because I can't take my eyes off you."
    },
    {
      tagalog: "Pwede ba kitang tawaging kalendaryo? Kasi kapag nakikita kita, napapangiti ako sa buong araw.",
      translation: "Can I call you a calendar? Because when I see you, you make me smile all day."
    },
    {
      tagalog: "Ikaw ba ay isang bituin? Kasi kapag nakikita kita, parang nasa langit ako.",
      translation: "Are you a star? Because when I see you, I feel like I'm in heaven."
    },
    {
      tagalog: "Pwede ba kitang tawaging chocolate? Kasi ang tamis ng ngiti mo.",
      translation: "Can I call you chocolate? Because your smile is so sweet."
    },
    {
      tagalog: "Ikaw ba ay isang araw? Kasi kapag wala ka, madilim ang mundo ko.",
      translation: "Are you the sun? Because when you're not around, my world is dark."
    }
  ];
  
  // Return a subset of the fallback lines based on the requested count
  return {
    statusCode: 200,
    body: JSON.stringify({ 
      lines: fallbackLines.slice(0, Math.min(count, fallbackLines.length)),
      note: "Using fallback pickup lines. OpenRouter API calls from Netlify functions are timing out."
    }),
    headers: { 'Content-Type': 'application/json' }
  };
}
