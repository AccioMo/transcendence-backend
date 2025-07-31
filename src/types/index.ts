import { FastifyInstance } from 'fastify';

// Common types used across the application
export interface User {
    id: string;
    username: string;
    stats?: UserStats;
}

export interface UserStats {
    wins: number;
    losses: number;
    rank: string;
    totalGames: number;
}

export interface GameState {
    gameId: string;
    players: string[];
    status: 'waiting' | 'active' | 'finished';
    score: {
        player1: number;
        player2: number;
    };
}

export interface ChatMessage {
    id: string;
    userId: string;
    username: string;
    message: string;
    timestamp: number;
}

export interface ChatRoom {
    id: string;
    name: string;
    users: number;
}

export interface LeaderboardEntry {
    rank: number;
    username: string;
    score: number;
    wins: number;
}

export interface MatchmakingStatus {
    inQueue: boolean;
    position: number | null;
    estimatedWait: string | null;
}

// Route registration function type
export type RouteRegistrar = (fastify: FastifyInstance) => Promise<void>;
