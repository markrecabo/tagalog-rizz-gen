"use client"
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type Message = {
  content: string;
  isUser: boolean;
};

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: input }),
      });

      if (!response.ok) throw new Error('Failed to generate response');
      
      const data = await response.json();
      
      setMessages(prev => [
        ...prev,
        { content: input, isUser: true },
        { content: data.text, isUser: false }
      ]);
      setInput('');
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-center">Tagalog Rizz Generator</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="h-96 overflow-y-auto space-y-2">
            {messages.map((msg, i) => (
              <div 
                key={i}
                className={`p-3 rounded-lg ${msg.isUser 
                  ? 'bg-blue-100 ml-auto w-3/4' 
                  : 'bg-gray-100 mr-auto w-3/4'}`}
              >
                {msg.content}
              </div>
            ))}
          </div>
          
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Enter your prompt..."
              disabled={isLoading}
            />
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Generating...' : 'Rizz'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
