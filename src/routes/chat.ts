import { FastifyInstance } from 'fastify';
import { RouteRegistrar, ChatRoom, ChatMessage } from '../types';

/**
 * Chat routes handler
 * Handles chat rooms, messages, and AI chat functionality
 */
export const chatRoutes: RouteRegistrar = async (fastify: FastifyInstance) => {
    // Chat Room Management
    
    // Get available chat rooms
    fastify.get('/api/chat/rooms', async (request, reply) => {
        const rooms: ChatRoom[] = [
            { 
                id: 'general', 
                name: 'General Chat', 
                users: 5 
            }
        ];
        return { rooms };
    });

    // Create new chat room
    fastify.post('/api/chat/rooms', async (request, reply) => {
        return { 
            roomId: 'room-id', 
            name: 'New Room' 
        };
    });

    // Get chat messages for a room
    fastify.get('/api/chat/rooms/:roomId/messages', async (request, reply) => {
        const messages: ChatMessage[] = [
            { 
                id: 'msg-1', 
                userId: 'user-1', 
                username: 'player1', 
                message: 'Hello!', 
                timestamp: Date.now() 
            }
        ];
        return { messages };
    });

    // Send message to room
    fastify.post('/api/chat/rooms/:roomId/messages', async (request, reply) => {
        return { 
            messageId: 'msg-id', 
            timestamp: Date.now() 
        };
    });

    // Join chat room
    fastify.post('/api/chat/rooms/:roomId/join', async (request, reply) => {
        return { 
            message: 'Joined room successfully' 
        };
    });

    // Leave chat room
    fastify.delete('/api/chat/rooms/:roomId/leave', async (request, reply) => {
        return { 
            message: 'Left room successfully' 
        };
    });

    // AI Chat Routes
    
    // Send message to AI
    fastify.post('/api/chat/ai/message', async (request, reply) => {
        return { 
            userMessage: 'received',
            aiResponse: 'AI generated response',
            timestamp: Date.now()
        };
    });

    // Get AI chat history
    fastify.get('/api/chat/ai/history', async (request, reply) => {
        return { 
            history: [
                { role: 'user', message: 'Hello AI', timestamp: Date.now() },
                { role: 'ai', message: 'Hello! How can I help?', timestamp: Date.now() }
            ]
        };
    });
};
