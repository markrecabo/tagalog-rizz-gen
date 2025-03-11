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

    // Use fallback pickup lines directly to avoid timeout issues
    return provideFallbackLines(count);
    
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
