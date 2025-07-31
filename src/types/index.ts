import { FastifyInstance } from 'fastify';

// Common types used across the application
export interface User {
    id: string;
    username: string;
    email?: string;
    stats?: UserStats;
}

export interface UserStats {
    wins: number;
    losses: number;
    rank: string;
    totalGames: number;
}

// Authentication types
export interface RegisterRequest {
    username: string;
    email: string;
    password: string;
}

export interface LoginRequest {
    username: string;
    password: string;
}

export interface AuthResponse {
    token: string;
    user: User;
}

export interface RegisterResponse {
    message: string;
    userId: string;
}

export interface LogoutResponse {
    message: string;
}

export interface GameState {
    gameId: string;
    players: GamePlayer[];
    ball: Ball;
    status: 'waiting' | 'active' | 'paused' | 'finished';
    score: {
        player1: number;
        player2: number;
    };
    isPrivate: boolean;
    maxPlayers: number;
    roomCode?: string;
    isAiGame: boolean;
    difficulty?: string;
    lastUpdate: number;
    winningScore: number;
    gameStartTime?: number;
}

export interface GamePlayer {
    userId: string;
    username: string;
    paddleY: number;
    score: number;
    isAi: boolean;
    side: 'left' | 'right';
}

export interface Ball {
    x: number; // 0 = left edge, 1 = right edge
    y: number; // 0 = top, 1 = bottom
    velocityX: number; // -1 to 1, negative = moving left
    velocityY: number; // -1 to 1, negative = moving up
    speed: number; // multiplier for velocity
}

export interface CreateGameRequest {
    isPrivate?: boolean;
    maxPlayers?: number;
}

export interface JoinGameRequest {
    roomCode?: string;
}

export interface StartAIGameRequest {
    difficulty?: 'easy' | 'medium' | 'hard' | 'expert';
}

export interface PlayerMoveRequest {
    paddleY: number;
    timestamp?: number;
}

export interface GameMoveMessage {
    type: 'player_move';
    userId: string;
    paddleY: number;
    timestamp?: number;
}

export interface ScoreUpdateMessage {
    type: 'score_update';
    userId: string;
    score: number;
}

export interface GameStateUpdateMessage {
    type: 'game_state_update';
    gameId: string;
    gameState: GameState;
}

export interface PingMessage {
    type: 'ping';
}

export interface PongMessage {
    type: 'pong';
    timestamp: number;
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
