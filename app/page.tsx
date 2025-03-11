"use client"
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
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
import { Heart, X, Settings, LogOut, LogIn, Sparkles, Coffee, Music } from "lucide-react";
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

type PickupLine = {
  id: string;
  content: string;
  translation?: string;
  saved: boolean;
};

type FavoritePickupLine = {
  id: string;
  content: string;
  translation?: string;
  user_id: string;
  created_at: string;
};

type Category = "romantic" | "funny" | "naughty";

type User = {
  id: string;
  email?: string;
};

const DEFAULT_SCENARIO = "You as a guy wanting to say a good pick up line on a girl you are talking for the first time to get her number or social info";

const CATEGORY_ICONS = {
  romantic: <Sparkles className="h-4 w-4 mr-2" />,
  funny: <Coffee className="h-4 w-4 mr-2" />,
  naughty: <Music className="h-4 w-4 mr-2" />
};

const CATEGORY_DESCRIPTIONS = {
  romantic: "Sweet and heartfelt lines to show your affection",
  funny: "Humorous lines that will make them laugh",
  naughty: "Playful and flirty lines with a bit of spice"
};

export default function ChatPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [lineCount, setLineCount] = useState<string>("5");
  const [pickupLines, setPickupLines] = useState<PickupLine[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<FavoritePickupLine[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [scenario, setScenario] = useState(DEFAULT_SCENARIO);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [showTranslations, setShowTranslations] = useState(true);

  // Create Supabase client safely with fallback for SSR
  const supabase = typeof window !== 'undefined' 
    ? createClientComponentClient() 
    : null;

  // Check for user session on component mount
  useEffect(() => {
    // Skip if we're in SSR or if Supabase client couldn't be created
    if (!supabase) return;
    
    const checkSession = async () => {
      try {
        // Use our custom session endpoint instead of direct Supabase call
        const response = await fetch('/api/auth/session');
        const data = await response.json();
        
        if (data.user) {
          setUser(data.user);
          fetchFavorites();
        }
      } catch (error) {
        console.error('Session error:', error);
      }
    };

    checkSession();
    
    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session) {
          setUser(session.user);
          fetchFavorites();
        } else {
          setUser(null);
          setFavorites([]);
        }
      }
    );
    
    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  // Fetch user's favorites
  const fetchFavorites = async () => {
    try {
      const response = await fetch('/api/favorites', {
        credentials: 'include'
      });
      const data = await response.json();

      if (Array.isArray(data)) {
        setFavorites(data);
      } else if (data.error) {
        console.error('Error fetching favorites:', data.error);
      }
    } catch (error) {
      console.error('Error fetching favorites:', error);
    }
  };

  // Generate pickup lines based on scenario and category
  const generatePickupLines = async () => {
    setLoading(true);
    setError(null);

    try {
      // Use the Netlify function endpoint instead of the Next.js API route
      const response = await fetch('/.netlify/functions/generate-pickup-line', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          scenario, 
          count: parseInt(lineCount), 
          category: selectedCategory 
        })
      });

      console.log('API Response status:', response.status);
      const data = await response.json();
      console.log('API Response data:', JSON.stringify(data, null, 2));

      if (data.error) {
        setError(data.error);
        setPickupLines([]);
      } else if (data.errorType && data.errorMessage) {
        // Handle Netlify function error format
        console.error('Netlify function error:', data);
        setError(data.errorMessage || 'An error occurred with the API');
        setPickupLines([]);
      } else if (!data.lines || !Array.isArray(data.lines)) {
        console.error('Invalid response format:', data);
        setError('Invalid response format from server. Please try again.');
        setPickupLines([]);
      } else {
        const newLines = data.lines.map((line: { tagalog: string, translation: string }) => ({
          id: Math.random().toString(36).substring(2, 9),
          content: line.tagalog || '',
          translation: line.translation || '',
          saved: false
        }));
        setPickupLines(newLines);
        
        // Display note if present (for fallback pickup lines)
        if (data.note) {
          setError(data.note);
        } else {
          setError(null);
        }
      }
    } catch (error) {
      console.error('Error generating pickup lines:', error);
      setError('Failed to generate pickup lines. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Save a pickup line to favorites
  const handleSave = async (id: string) => {
    if (!user) {
      console.log('Cannot save favorite: User not logged in');
      setError('Please log in to save favorites');
      return;
    }

    try {
      const lineToSave = pickupLines.find(line => line.id === id);
      if (!lineToSave) return;

      setIsSaving(true);
      
      const response = await fetch('/api/favorites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          content: lineToSave.content,
          translation: lineToSave.translation
        }),
        credentials: 'include'
      });

      const data = await response.json();

      if (response.ok) {
        // Mark the line as saved
        setPickupLines(prev => 
          prev.map(line => 
            line.id === id ? { ...line, saved: true } : line
          )
        );
        
        // Add the new favorite to the list and refresh favorites
        fetchFavorites();
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 2000);
      } else {
        console.error('Error saving favorite:', data.error);
        setError('Failed to save favorite. Please try again.');
      }
    } catch (error) {
      console.error('Error saving favorite:', error);
      setError('Failed to save favorite. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Delete a favorite
  const handleRemoveFavorite = async (id: string) => {
    if (!user) {
      console.log('Cannot delete favorite: User not logged in');
      return;
    }

    try {
      const response = await fetch(`/api/favorites?id=${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (response.ok) {
        // Remove the deleted favorite from the list
        setFavorites(prev => prev.filter(fav => fav.id !== id));
      } else {
        const data = await response.json();
        console.error('Error deleting favorite:', data.error);
      }
    } catch (error) {
      console.error('Error deleting favorite:', error);
    }
  };

  // Handle sign out
  const handleSignOut = async () => {
    await supabase?.auth.signOut();
    router.refresh();
  };

  // Handle sign in
  const handleSignIn = () => {
    router.push('/login');
  };

  // Handle category selection
  const handleCategorySelect = (category: Category) => {
    setSelectedCategory(prev => prev === category ? null : category);
  };

  // Toggle translations visibility
  const toggleTranslations = () => {
    setShowTranslations(prev => !prev);
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex flex-col md:flex-row gap-4">
        {/* Category Filter */}
        <div className="md:w-1/6">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-center text-sm">Categories</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-2">
                {(["romantic", "funny", "naughty"] as Category[]).map((category) => (
                  <Button
                    key={category}
                    variant={selectedCategory === category ? "default" : "outline"}
                    className="justify-start"
                    onClick={() => handleCategorySelect(category)}
                  >
                    {CATEGORY_ICONS[category]}
                    <span className="capitalize">{category}</span>
                  </Button>
                ))}
              </div>
              {selectedCategory && (
                <div className="mt-4 text-xs text-muted-foreground">
                  {CATEGORY_DESCRIPTIONS[selectedCategory]}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="md:w-1/2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-center flex-1">Tagalog Rizz Generator</CardTitle>
              <div className="flex items-center gap-2">
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
                {user ? (
                  <Button variant="outline" size="sm" onClick={handleSignOut}>
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" onClick={handleSignIn}>
                    <LogIn className="h-4 w-4 mr-2" />
                    Sign In
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">Number of pick-up lines:</div>
                  <ToggleGroup type="single" value={lineCount} onValueChange={(value) => value && setLineCount(value)}>
                    <ToggleGroupItem value="5" aria-label="5 lines">5</ToggleGroupItem>
                    <ToggleGroupItem value="10" aria-label="10 lines">10</ToggleGroupItem>
                    <ToggleGroupItem value="20" aria-label="20 lines">20</ToggleGroupItem>
                  </ToggleGroup>
                </div>

                <Button 
                  onClick={generatePickupLines} 
                  disabled={loading} 
                  className="w-full"
                >
                  {loading ? 'Generating...' : 'Generate Pickup Lines'}
                </Button>
              </div>

              {error && (
                <div className="p-4 bg-red-50 text-red-600 rounded-md">
                  {error}
                </div>
              )}

              {pickupLines.length > 0 && (
                <div className="mt-6 space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium">
                      Generated Pick-up Lines
                      {selectedCategory && (
                        <span className="ml-2 text-sm font-normal text-muted-foreground capitalize">
                          ({selectedCategory})
                        </span>
                      )}
                    </h3>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={toggleTranslations}
                    >
                      {showTranslations ? 'Hide' : 'Show'} Translations
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {pickupLines.map((line) => (
                      <Card key={line.id} className="relative">
                        <CardContent className="p-4">
                          <p className="font-medium">{line.content}</p>
                          {showTranslations && line.translation && (
                            <p className="text-sm text-muted-foreground mt-1 italic">
                              {line.translation}
                            </p>
                          )}
                          <div className="flex justify-start mt-2 gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handleSave(line.id)}
                              className="h-8 w-8"
                              disabled={line.saved || isSaving}
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
            </CardContent>
          </Card>
        </div>

        {/* Favorites Section */}
        <div className="md:w-1/3">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-center">My Favorites</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 overflow-y-auto max-h-[70vh]">
              {!user ? (
                <div className="text-center p-4">
                  <p className="text-muted-foreground mb-2">Sign in to save your favorite pickup lines</p>
                  <Button onClick={handleSignIn} size="sm">
                    <LogIn className="h-4 w-4 mr-2" />
                    Sign In
                  </Button>
                </div>
              ) : favorites.length === 0 ? (
                <div className="text-center p-4 text-muted-foreground">
                  <p>No favorites saved yet</p>
                  <p className="text-sm mt-2">Save some pickup lines to see them here</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {favorites.map((favorite) => (
                    <Card key={favorite.id} className="bg-muted/30">
                      <CardContent className="p-3">
                        <div className="flex justify-between items-start gap-2">
                          <div>
                            <p className="text-sm font-medium">{favorite.content}</p>
                            {showTranslations && favorite.translation && (
                              <p className="text-xs text-muted-foreground mt-1 italic">
                                {favorite.translation}
                              </p>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveFavorite(favorite.id)}
                            className="h-6 w-6 shrink-0 hover:bg-red-100 hover:text-red-500"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {isSaved && (
        <div className="fixed bottom-4 right-4 bg-green-100 text-green-800 p-3 rounded-md shadow-md animate-in fade-in slide-in-from-bottom-5 duration-300">
          Pickup line saved to favorites!
        </div>
      )}
    </div>
  );
}
