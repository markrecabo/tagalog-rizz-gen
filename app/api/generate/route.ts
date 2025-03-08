import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const { prompt } = await req.json();
  
  try {
    const apiKey = process.env.OPENROUTER_API_KEY?.trim().replace(/^["']|["']$/g, '');
    if (!apiKey) {
      throw new Error('OPENROUTER_API_KEY is not set');
    }
    if (!apiKey.startsWith('sk-or-')) {
      throw new Error('Invalid OpenRouter API key format. Key should start with sk-or-');
    }

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
          content: `Generate a creative tagalog pick-up line about: ${prompt}. Keep it under 2 sentences and use romantic taglish if appropriate.`
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
    return NextResponse.json({ text: data.choices[0].message.content });
  } catch (error) {
    console.error('Error generating response:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate response' },
      { status: 500 }
    );
  }
}
