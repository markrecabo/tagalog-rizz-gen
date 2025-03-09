"use client"
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Heart, X, Settings } from "lucide-react";

type PickupLine = {
  id: string;
  content: string;
  saved: boolean;
};

const DEFAULT_SCENARIO = "You as a guy wanting to say a good pick up line on a girl you are talking for the first time to get her number or social info";

export default function ChatPage() {
  const [input, setInput] = useState('');
  const [scenario, setScenario] = useState(DEFAULT_SCENARIO);
  const [isLoading, setIsLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [lineCount, setLineCount] = useState<string>("5");
  const [pickupLines, setPickupLines] = useState<PickupLine[]>([]);
  const [savedLines, setSavedLines] = useState<PickupLine[]>([]);

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
        body: JSON.stringify({ 
          prompt: input,
          scenario: scenario,
          count: parseInt(lineCount)
        }),
      });

      if (!response.ok) throw new Error('Failed to generate response');
      
      const data = await response.json();
      
      if (data.lines && Array.isArray(data.lines)) {
        const newLines = data.lines.map((line: string) => ({
          id: Math.random().toString(36).substring(2, 9),
          content: line,
          saved: false
        }));
        setPickupLines(newLines);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = (id: string) => {
    setPickupLines(prev => {
      const updatedLines = prev.map(line => 
        line.id === id ? { ...line, saved: true } : line
      );
      
      const lineToSave = updatedLines.find(line => line.id === id);
      if (lineToSave) {
        setSavedLines(prev => [...prev, lineToSave]);
      }
      
      return updatedLines;
    });
  };

  const handleDiscard = (id: string) => {
    setPickupLines(prev => prev.filter(line => line.id !== id));
  };

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-center flex-1">Tagalog Rizz Generator</CardTitle>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Scenario
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Set Scenario</DialogTitle>
                <DialogDescription>
                  Define the context for your pick-up lines. This will help generate more relevant and personalized responses.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <Textarea
                  value={scenario}
                  onChange={(e) => setScenario(e.target.value)}
                  placeholder="Describe the scenario..."
                  className="min-h-[100px]"
                />
              </div>
              <DialogFooter>
                <Button onClick={() => setDialogOpen(false)}>Save Changes</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Enter your prompt..."
                disabled={isLoading}
              />
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Generating...' : 'Rizz'}
              </Button>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">Number of pick-up lines:</div>
              <ToggleGroup type="single" value={lineCount} onValueChange={(value) => value && setLineCount(value)}>
                <ToggleGroupItem value="5" aria-label="5 lines">5</ToggleGroupItem>
                <ToggleGroupItem value="10" aria-label="10 lines">10</ToggleGroupItem>
                <ToggleGroupItem value="20" aria-label="20 lines">20</ToggleGroupItem>
              </ToggleGroup>
            </div>
          </form>
          
          {pickupLines.length > 0 && (
            <div className="mt-6 space-y-4">
              <h3 className="text-lg font-medium">Generated Pick-up Lines</h3>
              <div className="space-y-3">
                {pickupLines.map((line) => (
                  <Card key={line.id} className="relative">
                    <CardContent className="p-4">
                      <p>{line.content}</p>
                      <div className="flex justify-start mt-2 gap-2">
                        <Button 
                          variant="outline" 
                          size="icon" 
                          onClick={() => handleDiscard(line.id)}
                          className="h-8 w-8"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="icon" 
                          onClick={() => handleSave(line.id)}
                          className="h-8 w-8"
                          disabled={line.saved}
                        >
                          <Heart className={`h-4 w-4 ${line.saved ? 'fill-red-500 text-red-500' : ''}`} />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
          
          {savedLines.length > 0 && (
            <div className="mt-6 space-y-4">
              <h3 className="text-lg font-medium">Saved Pick-up Lines</h3>
              <div className="space-y-3">
                {savedLines.map((line) => (
                  <Card key={line.id} className="relative bg-muted/50">
                    <CardContent className="p-4">
                      <p>{line.content}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
