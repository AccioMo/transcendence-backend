import { FastifyInstance } from 'fastify';

/**
 * Game WebSocket handler
 * Handles real-time game communication
 */
export const setupGameWebSocket = async (fastify: FastifyInstance) => {
    (fastify as any).get('/ws/game/:gameId', { websocket: true }, (connection: any, req: any) => {
        const gameId = req.params.gameId;
        
        connection.socket.on('message', (message: any) => {
            // Handle real-time game messages
            const data = { 
                type: 'game_update', 
                gameId, 
                data: {} 
            };
            connection.socket.send(JSON.stringify(data));
        });
        
        connection.socket.on('close', () => {
            console.log(`Game WebSocket connection closed for game: ${gameId}`);
        });
    });
};
