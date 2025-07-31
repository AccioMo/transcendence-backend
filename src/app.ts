import fastify from 'fastify';
import { FastifyRequest } from 'fastify';

const app = fastify({ logger: true });

app.get('/', async (request, reply) => {
    return { message: 'Ping Pong Chat API Server', status: 'healthy' };
});

// Authentication routes
app.post('/api/auth/register', async (request, reply) => {
    // User registration logic
    return { message: 'User registered successfully', userId: 'generated-id' };
});

app.post('/api/auth/login', async (request, reply) => {
    // User login logic
    return { token: 'jwt-token', user: { id: 'user-id', username: 'username' } };
});

app.post('/api/auth/logout', async (request, reply) => {
    // Logout logic
    return { message: 'Logged out successfully' };
});

// User profile routes
app.get('/api/users/profile', async (request, reply) => {
    // Get user profile
    return { user: { id: 'user-id', username: 'username', stats: {} } };
});

app.put('/api/users/profile', async (request, reply) => {
    // Update user profile
    return { message: 'Profile updated successfully' };
});

app.get('/api/users/stats', async (request, reply) => {
    // Get user game statistics
    return { wins: 0, losses: 0, rank: 'beginner', totalGames: 0 };
});

// Game routes - PvP
app.post('/api/game/create', async (request, reply) => {
    // Create new game room
    return { gameId: 'game-id', roomCode: 'ABC123' };
});

app.post('/api/game/join/:gameId', async (request, reply) => {
    // Join existing game
    const { gameId } = request.params as { gameId: string };
    return { message: 'Joined game successfully', gameId };
});

app.get('/api/game/:gameId', async (request, reply) => {
    // Get game state
    const { gameId } = request.params as { gameId: string };
    return { 
        gameId,
        players: [],
        status: 'waiting',
        score: { player1: 0, player2: 0 }
    };
});

app.post('/api/game/:gameId/move', async (request, reply) => {
    // Submit player move (paddle position)
    return { message: 'Move registered', timestamp: Date.now() };
});

app.delete('/api/game/:gameId/leave', async (request, reply) => {
    // Leave game
    return { message: 'Left game successfully' };
});

// Game routes - AI
app.post('/api/game/ai/start', async (request, reply) => {
    // Start AI game
    return { gameId: 'ai-game-id', difficulty: 'medium' };
});

app.post('/api/game/ai/:gameId/move', async (request, reply) => {
    // Submit move against AI
    return { 
        playerMove: 'received',
        aiMove: 'calculated',
        gameState: 'updated'
    };
});

// Matchmaking routes
app.post('/api/matchmaking/queue', async (request, reply) => {
    // Join matchmaking queue
    return { message: 'Added to queue', position: 1, estimatedWait: '30s' };
});

app.delete('/api/matchmaking/queue', async (request, reply) => {
    // Leave matchmaking queue
    return { message: 'Removed from queue' };
});

app.get('/api/matchmaking/status', async (request, reply) => {
    // Get queue status
    return { inQueue: false, position: null, estimatedWait: null };
});

// Chat routes
app.get('/api/chat/rooms', async (request, reply) => {
    // Get available chat rooms
    return { rooms: [{ id: 'general', name: 'General Chat', users: 5 }] };
});

app.post('/api/chat/rooms', async (request, reply) => {
    // Create new chat room
    return { roomId: 'room-id', name: 'New Room' };
});

app.get('/api/chat/rooms/:roomId/messages', async (request, reply) => {
    // Get chat messages
    return { 
        messages: [
            { id: 'msg-1', userId: 'user-1', username: 'player1', message: 'Hello!', timestamp: Date.now() }
        ]
    };
});

app.post('/api/chat/rooms/:roomId/messages', async (request, reply) => {
    // Send message to room
    return { messageId: 'msg-id', timestamp: Date.now() };
});

app.post('/api/chat/rooms/:roomId/join', async (request, reply) => {
    // Join chat room
    return { message: 'Joined room successfully' };
});

app.delete('/api/chat/rooms/:roomId/leave', async (request, reply) => {
    // Leave chat room
    return { message: 'Left room successfully' };
});

// AI Chat routes
app.post('/api/chat/ai/message', async (request, reply) => {
    // Send message to AI
    return { 
        userMessage: 'received',
        aiResponse: 'AI generated response',
        timestamp: Date.now()
    };
});

app.get('/api/chat/ai/history', async (request, reply) => {
    // Get AI chat history
    return { 
        history: [
            { role: 'user', message: 'Hello AI', timestamp: Date.now() },
            { role: 'ai', message: 'Hello! How can I help?', timestamp: Date.now() }
        ]
    };
});

// Leaderboard routes
app.get('/api/leaderboard/global', async (request, reply) => {
    // Get global leaderboard
    return { 
        leaderboard: [
            { rank: 1, username: 'player1', score: 1500, wins: 50 }
        ]
    };
});

app.get('/api/leaderboard/friends', async (request, reply) => {
    // Get friends leaderboard
    return { leaderboard: [] };
});

// Friends routes
app.get('/api/friends', async (request, reply) => {
    // Get friends list
    return { friends: [] };
});

app.post('/api/friends/request', async (request, reply) => {
    // Send friend request
    return { message: 'Friend request sent' };
});

app.post('/api/friends/accept/:requestId', async (request, reply) => {
    // Accept friend request
    return { message: 'Friend request accepted' };
});

app.delete('/api/friends/:friendId', async (request, reply) => {
    // Remove friend
    return { message: 'Friend removed' };
});

// WebSocket routes (for real-time features)
app.register(async function (fastify) {
    await fastify.register(require('@fastify/websocket'));
    
    (fastify as any).get('/ws/game/:gameId', { websocket: true }, (connection: any, req: any) => {
        const gameId = req.params.gameId;
        
        connection.socket.on('message', (message: any) => {
            // Handle real-time game messages
            const data = { type: 'game_update', gameId, data: {} };
            connection.socket.send(JSON.stringify(data));
        });
        
        connection.socket.on('close', () => {
            console.log(`Game WebSocket connection closed for game: ${gameId}`);
        });
    });
    
    (fastify as any).get('/ws/chat/:roomId', { websocket: true }, (connection: any, req: any) => {
        const roomId = req.params.roomId;
        
        connection.socket.on('message', (message: any) => {
            // Handle real-time chat messages
            const data = { type: 'new_message', roomId, data: {} };
            connection.socket.send(JSON.stringify(data));
        });
        
        connection.socket.on('close', () => {
            console.log(`Chat WebSocket connection closed for room: ${roomId}`);
        });
    });
});

const start = async () => {
    try {
        await app.listen({ port: 3000, host: '0.0.0.0' });
        app.log.info(`Server listening on http://localhost:3000`);
    } catch (err) {
        app.log.error(err);
        process.exit(1);
    }
};

start();
