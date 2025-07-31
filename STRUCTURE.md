# Project Structure

This document describes the organized structure of the Ping Pong Chat API backend.

## Directory Structure

```
src/
├── app.ts                 # Main application entry point
├── config/
│   └── index.ts          # Application configuration
├── types/
│   └── index.ts          # TypeScript type definitions
├── routes/
│   ├── index.ts          # Route registration handler
│   ├── auth.ts           # Authentication routes
│   ├── users.ts          # User profile and stats routes
│   ├── game.ts           # Game routes (PvP and AI)
│   ├── matchmaking.ts    # Matchmaking routes
│   ├── chat.ts           # Chat routes
│   ├── leaderboard.ts    # Leaderboard routes
│   └── friends.ts        # Friends management routes
└── websockets/
    ├── index.ts          # WebSocket setup handler
    ├── game-websocket.ts # Game WebSocket handlers
    └── chat-websocket.ts # Chat WebSocket handlers
```

## Module Organization

### Main Application (`app.ts`)
- Application entry point
- Server configuration and startup
- Health check endpoint
- Registers all routes and WebSocket handlers

### Configuration (`config/`)
- Centralized application configuration
- Server, logging, WebSocket, game, chat, and matchmaking settings
- Easy to modify and environment-specific configurations

### Types (`types/`)
- TypeScript type definitions
- Shared interfaces and types used across the application
- Ensures type safety throughout the codebase

### Routes (`routes/`)
Each route module handles a specific domain:

- **`auth.ts`**: User registration, login, logout
- **`users.ts`**: User profiles and statistics
- **`game.ts`**: PvP and AI game functionality
- **`matchmaking.ts`**: Queue management for finding opponents
- **`chat.ts`**: Chat rooms, messages, and AI chat
- **`leaderboard.ts`**: Global and friends leaderboards
- **`friends.ts`**: Friend requests and management

### WebSockets (`websockets/`)
- **`game-websocket.ts`**: Real-time game communication
- **`chat-websocket.ts`**: Real-time chat communication
- **`index.ts`**: WebSocket setup and registration

## Benefits of This Structure

1. **Separation of Concerns**: Each file handles a specific domain
2. **Maintainability**: Easy to locate and modify specific functionality
3. **Scalability**: New features can be added as separate modules
4. **Type Safety**: Centralized type definitions ensure consistency
5. **Configuration Management**: Centralized configuration for easy environment management
6. **Modularity**: Each module can be developed and tested independently

## Adding New Features

1. **New Routes**: Add new route files in `routes/` and register them in `routes/index.ts`
2. **New Types**: Add type definitions to `types/index.ts`
3. **New WebSocket Handlers**: Add handlers in `websockets/` and register in `websockets/index.ts`
4. **Configuration**: Add new configuration options to `config/index.ts`

## Running the Application

The application can be started using the same commands as before:

```bash
npm run dev    # Development mode with auto-restart
npm start      # Production mode
npm run build  # Build TypeScript to JavaScript
```

All existing API endpoints remain the same, ensuring backward compatibility.
