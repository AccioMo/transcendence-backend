import { FastifyInstance } from 'fastify';

/**
 * Chat WebSocket handler
 * Handles real-time chat communication
 */
export const setupChatWebSocket = async (fastify: FastifyInstance) => {
    (fastify as any).get('/ws/chat/:roomId', { websocket: true }, (connection: any, req: any) => {
        const roomId = req.params.roomId;
        
        connection.socket.on('message', (message: any) => {
            // Handle real-time chat messages
            const data = { 
                type: 'new_message', 
                roomId, 
                data: {} 
            };
            connection.socket.send(JSON.stringify(data));
        });
        
        connection.socket.on('close', () => {
            console.log(`Chat WebSocket connection closed for room: ${roomId}`);
        });
    });
};
