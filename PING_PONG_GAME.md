# Ping-Pong Game Implementation

## Overview
This is a real-time 2D ping-pong (table tennis) game implementation using WebSockets for real-time communication and HTTP REST API for game management.

## Game Mechanics

### Ball Physics
- **Position**: Normalized coordinates (0-1) for both X and Y axes
- **Velocity**: Direction and speed of ball movement
- **Collisions**: Ball bounces off top/bottom walls and player paddles
- **Scoring**: Point scored when ball passes left/right boundaries
- **Speed**: Ball speed increases slightly after each paddle hit

### Paddle Controls
- **Position**: `paddleY` value between 0.1 and 0.9 (normalized)
- **Sides**: Left player controls left paddle, right player controls right paddle
- **Movement**: Real-time updates via WebSocket messages

### Scoring System
- **Winning Score**: 11 points (standard ping-pong)
- **Serving**: Ball direction alternates after each point
- **Game End**: First player to reach winning score wins

## API Endpoints

### PvP Games
- `POST /api/game/create` - Create new multiplayer game
- `POST /api/game/join/:gameId` - Join existing game
- `GET /api/game/:gameId` - Get game state
- `DELETE /api/game/:gameId/leave` - Leave game

### AI Games
- `POST /api/game/ai/start` - Start AI game with difficulty selection
- `GET /api/game/ai/:gameId` - Get AI game state

### Legacy Move Endpoints (Use WebSocket for real-time)
- `POST /api/game/:gameId/move` - Submit paddle move
- `POST /api/game/ai/:gameId/move` - Submit move in AI game

## WebSocket Communication

### Connection
```
ws://localhost:3000/ws/game/:gameId
```

### Message Types

#### Client to Server
```typescript
// Player move
{
  type: 'player_move',
  userId: string,
  paddleY: number, // 0.1 - 0.9
  timestamp?: number
}

// Ping for latency
{
  type: 'ping',
  timestamp: number
}

// Game ready signal
{
  type: 'game_ready'
}

// Pause request
{
  type: 'pause_request',
  userId: string
}
```

#### Server to Client
```typescript
// Game state update
{
  type: 'game_state_update',
  gameId: string,
  gameState: {
    gameId: string,
    players: GamePlayer[],
    ball: Ball,
    status: 'waiting' | 'active' | 'paused' | 'finished',
    score: { player1: number, player2: number },
    // ... other properties
  }
}

// Pong response
{
  type: 'pong',
  timestamp: number,
  clientTimestamp: number
}

// Error message
{
  type: 'error',
  message: string
}
```

## Game State Structure

### GamePlayer
```typescript
{
  userId: string,
  username: string,
  paddleY: number, // 0.1 - 0.9
  score: number,
  isAi: boolean,
  side: 'left' | 'right'
}
```

### Ball
```typescript
{
  x: number, // 0-1, 0=left edge, 1=right edge
  y: number, // 0-1, 0=top, 1=bottom
  velocityX: number, // -1 to 1, negative=left
  velocityY: number, // -1 to 1, negative=up
  speed: number // speed multiplier
}
```

## AI Difficulty Levels

### Easy
- Speed: 0.3
- Accuracy: 0.6
- Reaction Time: 300ms

### Medium
- Speed: 0.5
- Accuracy: 0.75
- Reaction Time: 200ms

### Hard
- Speed: 0.7
- Accuracy: 0.85
- Reaction Time: 150ms

### Expert
- Speed: 0.9
- Accuracy: 0.95
- Reaction Time: 100ms

## Database Schema

### Games Table
- `id` - Game identifier
- `room_code` - 6-character room code for private games
- `created_by` - User who created the game
- `is_private` - Whether game requires room code
- `max_players` - Maximum players (2 for ping-pong)
- `status` - Game status
- `is_ai_game` - Whether this is an AI game
- `difficulty` - AI difficulty level

### Game Players Table
- `game_id` - Reference to game
- `user_id` - Player user ID
- `score` - Current player score
- `is_ai` - Whether this player is AI

### Game Moves Table
- `game_id` - Reference to game
- `user_id` - Player who made move
- `paddle_y` - Paddle position
- `timestamp` - When move was made

## Usage Example

1. **Create Game**: `POST /api/game/create`
2. **Join via WebSocket**: Connect to `ws://localhost:3000/ws/game/:gameId`
3. **Send Moves**: Send `player_move` messages with paddle positions
4. **Receive Updates**: Get real-time game state updates
5. **Game End**: Receive final game state when someone reaches 11 points

## Real-time Features
- **60 FPS Ball Physics**: Ball position updates every frame
- **Low Latency**: WebSocket communication for instant paddle updates
- **Lag Compensation**: Timestamp-based move validation
- **Connection Recovery**: Automatic reconnection handling
- **Spectator Mode**: View-only game state access
