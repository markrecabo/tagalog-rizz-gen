# Project Plan

## 1. Project Setup
- Initialize Next.js with TypeScript
- Configure shadcn/ui components
- Set up Tailwind CSS

## 2. Key Components
graph TD;
    A[Chat Interface] --> B[Message Input];
    A --> C[Message Display];
    A --> D[API Integration];
    D --> E[OpenRouter API];
    E --> F[Model Selection: Gemini/DeepSeek];
## 3. Required Information
- Your OpenRouter API key (will be stored in `.env.local`)
- Preferred model (`deepseek/deepseek-chat:free`, `deepseek-r1-zero:free` and `gemini-2.0-flash-lite-preview-02-05:free`)
- Any specific styling preferences (colors, layout constraints)

## 4. Next Steps
1. Create base Next.js project structure
2. Install shadcn/ui with essential components
3. Implement chat UI with message history
4. Integrate OpenRouter API calls
5. Add error handling and loading states

## Would you like to:
1. Proceed with this plan
2. Modify any components
3. Provide API credentials first
4. Switch to Act Mode to begin implementation
