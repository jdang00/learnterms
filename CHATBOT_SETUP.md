# OM Assistant Chatbot Setup Guide

## Overview

You now have a fully functional AI chatbot integrated into your OM (Optometry's Meeting 2025) page! The chatbot helps users find information about events, schedule details, requirements, and more.

## Setup Instructions

### 1. Environment Variables

Create a `.env` file in your project root and add your Google Gemini API key:

```env
GEMINI_API_KEY=your_gemini_api_key_here
```

You can get an API key from [Google AI Studio](https://makersuite.google.com/app/apikey).

### 2. Features

The chatbot includes:

- **Real-time chat interface** with DaisyUI styling
- **Schedule integration** - passes your OM schedule data to the AI for accurate responses
- **Floating chat button** that appears in the bottom-right corner
- **Smart responses** about OM events, requirements, timing, and logistics
- **Mobile-responsive design**

### 3. Customization

You can customize the chatbot by editing:

#### System Prompt (`src/routes/api/chat/+server.ts`)

The `SYSTEM_PROMPT` contains comprehensive information about OM 2025. You can add more specific details about:

- Speaker information
- Venue details
- Registration information
- Networking events
- Special requirements

#### Chatbot Appearance (`src/lib/components/OMChatbot.svelte`)

Customize the:

- Color scheme (using DaisyUI classes)
- Chat window size and position
- Avatar icons and styling
- Initial greeting message

### 4. Usage

Once set up, the chatbot will:

1. Appear as a floating button in the bottom-right corner
2. Open when clicked to show a chat interface
3. Respond to questions about OM 2025 using the schedule data
4. Help users navigate and find specific events

### 5. Integration

The chatbot is automatically integrated into your OM page at `/OM` and includes:

- Access to your schedule data from `scheduleLogic.schedule`
- State management for open/closed status
- Event dispatcher for custom interactions

### 6. Sample Questions Users Can Ask

- "What are the required events on Wednesday?"
- "Tell me about the networking opportunities"
- "What time is the opening ceremony?"
- "Are there any events about practice management?"
- "Which events are mandatory for students?"

### 7. Technical Details

- Built with **Vercel AI SDK** for Svelte
- Uses **Google Gemini 2.0 Flash Experimental** model
- Implements **streaming responses** for real-time chat
- **DaisyUI components** for consistent styling
- **TypeScript** for type safety

### 8. Troubleshooting

If the chatbot isn't working:

1. Check that your `GEMINI_API_KEY` is set correctly
2. Ensure you're running the development server with `npm run dev`
3. Check the browser console for any error messages
4. Verify the API route is accessible at `/api/chat`

## Next Steps

- Add more specific OM information to the system prompt
- Consider adding tools for real-time data (weather, maps, etc.)
- Implement user authentication if needed
- Add chat persistence for returning users
