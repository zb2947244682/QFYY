/**
 * 清风月影游戏Socket信令服务器
 * 提供WebRTC信令服务和房间管理功能
 */
const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors');
const crypto = require('crypto');

// 创建Express应用
const app = express();
const server = http.createServer(app);

// 配置CORS中间件
app.use(cors({
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true
}));

// 配置Socket.IO，支持CORS
const io = socketIO(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
        credentials: true
    }
});

/**
 * 房间管理类
 * 负责游戏房间的创建、加入、离开等操作
 */
class RoomManager {
    constructor() {
        this.rooms = new Map(); // 存储所有房间
        this.playerRooms = new Map(); // 存储玩家所在的房间
    }
    
    /**
     * 生成唯一的房间ID
     * @returns {string} 6位大写字母数字组合的房间ID
     */
    generateRoomId() {
        return crypto.randomBytes(3).toString('hex').toUpperCase();
    }
    
    /**
     * 创建新房间
     * @param {string} hostSocketId - 房主的Socket ID
     * @returns {Object} 创建的房间对象
     */
    createRoom(hostSocketId) {
        let roomId;
        do {
            roomId = this.generateRoomId();
        } while (this.rooms.has(roomId));
        
        const room = {
            id: roomId,
            host: hostSocketId,
            players: [hostSocketId],
            readyPlayers: [],
            createdAt: Date.now()
        };
        
        this.rooms.set(roomId, room);
        this.playerRooms.set(hostSocketId, roomId);
        
        console.log(`房间创建: ${roomId}, 房主: ${hostSocketId}`);
        console.log(`当前房间状态:`, room);
        return room;
    }
    
    /**
     * 加入房间
     * @param {string} roomId - 房间ID
     * @param {string} playerSocketId - 玩家的Socket ID
     * @returns {Object} 加入结果，包含成功状态和房间信息或错误信息
     */
    joinRoom(roomId, playerSocketId) {
        const room = this.rooms.get(roomId);
        
        if (!room) {
            console.log(`房间不存在: ${roomId}`);
            return { success: false, error: '房间不存在' };
        }
        
        if (room.players.length >= 2) {
            console.log(`房间已满: ${roomId}, 当前玩家数: ${room.players.length}`);
            return { success: false, error: '房间已满' };
        }
        
        if (room.players.includes(playerSocketId)) {
            console.log(`玩家已在房间中: ${playerSocketId} in ${roomId}`);
            return { success: false, error: '已在房间中' };
        }
        
        room.players.push(playerSocketId);
        this.playerRooms.set(playerSocketId, roomId);
        
        console.log(`玩家 ${playerSocketId} 加入房间 ${roomId}`);
        console.log(`房间 ${roomId} 当前状态:`, room);
        
        return { success: true, room };
    }
    
    /**
     * 离开房间
     * @param {string} playerSocketId - 玩家的Socket ID
     * @returns {Object|null} 房间对象或null
     */
    leaveRoom(playerSocketId) {
        const roomId = this.playerRooms.get(playerSocketId);
        
        if (!roomId) {
            console.log(`玩家 ${playerSocketId} 不在任何房间中`);
            return null;
        }
        
        const room = this.rooms.get(roomId);
        
        if (room) {
            // 移除玩家
            room.players = room.players.filter(id => id !== playerSocketId);
            room.readyPlayers = room.readyPlayers.filter(id => id !== playerSocketId);
            
            // 清理重新开始请求
            if (room.restartRequests) {
                room.restartRequests = room.restartRequests.filter(id => id !== playerSocketId);
            }
            
            console.log(`玩家 ${playerSocketId} 离开房间 ${roomId}`);
            console.log(`房间 ${roomId} 剩余玩家:`, room.players);
            
            // 如果房间为空，删除房间
            if (room.players.length === 0) {
                this.rooms.delete(roomId);
                console.log(`房间 ${roomId} 已删除`);
            } else if (room.host === playerSocketId) {
                // 如果房主离开，转移房主
                room.host = room.players[0];
                console.log(`房间 ${roomId} 房主转移至 ${room.host}`);
            }
        }
        
        this.playerRooms.delete(playerSocketId);
        
        return room;
    }
    
    /**
     * 获取指定房间
     * @param {string} roomId - 房间ID
     * @returns {Object|undefined} 房间对象
     */
    getRoom(roomId) {
        return this.rooms.get(roomId);
    }
    
    /**
     * 获取玩家所在房间
     * @param {string} playerSocketId - 玩家的Socket ID
     * @returns {Object|null} 房间对象或null
     */
    getPlayerRoom(playerSocketId) {
        const roomId = this.playerRooms.get(playerSocketId);
        return roomId ? this.rooms.get(roomId) : null;
    }
    
    /**
     * 获取房间列表
     * @returns {Array} 房间列表数组
     */
    getRoomList() {
        const roomList = [];
        
        this.rooms.forEach((room, roomId) => {
            roomList.push({
                id: roomId,
                playerCount: room.players.length,
                createdAt: room.createdAt
            });
        });
        
        // 按创建时间排序
        roomList.sort((a, b) => b.createdAt - a.createdAt);
        
        return roomList;
    }
    
    /**
     * 标记玩家准备状态
     * @param {string} playerSocketId - 玩家的Socket ID
     * @returns {Object|false} 如果所有玩家都准备好返回房间对象，否则返回false
     */
    markPlayerReady(playerSocketId) {
        const room = this.getPlayerRoom(playerSocketId);
        
        if (!room) {
            console.log(`玩家 ${playerSocketId} 准备失败：不在房间中`);
            return false;
        }
        
        if (!room.readyPlayers.includes(playerSocketId)) {
            room.readyPlayers.push(playerSocketId);
            console.log(`玩家 ${playerSocketId} 已准备，房间 ${room.id} 准备玩家:`, room.readyPlayers);
        }
        
        // 检查是否所有玩家都准备好
        if (room.readyPlayers.length === 2) {
            console.log(`房间 ${room.id} 所有玩家已准备，开始游戏`);
            return room;
        }
        
        console.log(`房间 ${room.id} 准备玩家数: ${room.readyPlayers.length}/2`);
        return false;
    }
    
    /**
     * 清理超时房间
     * 删除超过30分钟且无玩家的房间
     */
    cleanupRooms() {
        const now = Date.now();
        const timeout = 30 * 60 * 1000; // 30分钟超时
        
        this.rooms.forEach((room, roomId) => {
            if (now - room.createdAt > timeout && room.players.length === 0) {
                this.rooms.delete(roomId);
                console.log(`清理超时房间: ${roomId}`);
            }
        });
    }
}

// 创建房间管理器实例
const roomManager = new RoomManager();



/**
 * Socket.IO连接处理
 */
io.on('connection', (socket) => {
    console.log(`客户端连接: ${socket.id}`);
    
    /**
     * 创建房间事件处理
     */
    socket.on('create-room', () => {
        console.log(`客户端 ${socket.id} 请求创建房间`);
        const room = roomManager.createRoom(socket.id);
        
        socket.join(room.id);
        socket.emit('room-created', {
            roomId: room.id,
            isHost: true
        });
        
        console.log(`房间创建成功，通知客户端 ${socket.id}`);
        
        // 更新房间列表
        io.emit('room-list', roomManager.getRoomList());
    });
    
    /**
     * 加入房间事件处理
     */
    socket.on('join-room', (data) => {
        const { roomId } = data;
        console.log(`客户端 ${socket.id} 请求加入房间 ${roomId}`);
        
        const result = roomManager.joinRoom(roomId, socket.id);
        
        if (result.success) {
            socket.join(roomId);
            socket.emit('room-joined', {
                roomId: roomId,
                isHost: false
            });
            
            console.log(`客户端 ${socket.id} 加入房间成功`);
            
            // 通知房主有玩家加入
            socket.to(roomId).emit('player-joined', {
                playerId: socket.id
            });
            
            // 更新房间列表
            io.emit('room-list', roomManager.getRoomList());
        } else {
            console.log(`客户端 ${socket.id} 加入房间失败: ${result.error}`);
            socket.emit('room-error', {
                message: result.error
            });
        }
    });
    
    /**
     * 离开房间事件处理
     */
    socket.on('leave-room', (data) => {
        console.log(`客户端 ${socket.id} 请求离开房间 ${data.roomId}`);
        const room = roomManager.leaveRoom(socket.id);
        
        if (room && data.roomId) {
            socket.leave(data.roomId);
            socket.to(data.roomId).emit('player-left', {
                playerId: socket.id
            });
            
            // 更新房间列表
            io.emit('room-list', roomManager.getRoomList());
        }
    });
    
    /**
     * 获取房间列表事件处理
     */
    socket.on('get-rooms', () => {
        console.log(`客户端 ${socket.id} 请求房间列表`);
        socket.emit('room-list', roomManager.getRoomList());
    });
    
    /**
     * WebRTC Offer事件处理
     */
    socket.on('webrtc-offer', (data) => {
        const { roomId, offer } = data;
        console.log(`转发WebRTC Offer: 房间 ${roomId}, 来自 ${socket.id}`);
        socket.to(roomId).emit('webrtc-offer', {
            offer: offer,
            from: socket.id
        });
    });
    
    /**
     * WebRTC Answer事件处理
     */
    socket.on('webrtc-answer', (data) => {
        const { roomId, answer } = data;
        console.log(`转发WebRTC Answer: 房间 ${roomId}, 来自 ${socket.id}`);
        socket.to(roomId).emit('webrtc-answer', {
            answer: answer,
            from: socket.id
        });
    });
    
    /**
     * ICE候选事件处理
     */
    socket.on('ice-candidate', (data) => {
        const { roomId, candidate } = data;
        console.log(`转发ICE候选: 房间 ${roomId}, 来自 ${socket.id}`);
        socket.to(roomId).emit('ice-candidate', {
            candidate: candidate,
            from: socket.id
        });
    });
    
    /**
     * 玩家准备事件处理
     */
    socket.on('ready-to-play', (data) => {
        console.log(`客户端 ${socket.id} 准备开始游戏`);
        const room = roomManager.markPlayerReady(socket.id);
        
        if (room) {
            // 所有玩家都准备好了，开始游戏
            const players = room.players;
            
            // 随机分配黑白棋
            const blackIndex = Math.floor(Math.random() * 2);
            const whiteIndex = 1 - blackIndex;
            
            console.log(`游戏开始: 房间 ${room.id}, 黑棋: ${players[blackIndex]}, 白棋: ${players[whiteIndex]}`);
            
            // 通知黑棋玩家
            io.to(players[blackIndex]).emit('game-start', {
                playerColor: 1, // 黑棋
                opponentId: players[whiteIndex]
            });
            
            // 通知白棋玩家
            io.to(players[whiteIndex]).emit('game-start', {
                playerColor: 2, // 白棋
                opponentId: players[blackIndex]
            });
            
            console.log(`游戏开始通知已发送: 房间 ${room.id}`);
        }
    });
    
    /**
     * 落子事件处理
     */
    socket.on('make-move', (data) => {
        const { roomId, row, col } = data;
        console.log(`客户端 ${socket.id} 落子: 房间 ${roomId}, 位置 (${row}, ${col})`);
        
        // 转发给房间内的其他玩家
        socket.to(roomId).emit('opponent-move', {
            row: row,
            col: col
        });
    });
    
    /**
     * 重新开始游戏事件处理
     */
    socket.on('restart-game', (data) => {
        const { roomId } = data;
        console.log(`客户端 ${socket.id} 请求重新开始游戏: 房间 ${roomId}`);
        
        // 重置房间准备状态
        const room = roomManager.getRoom(roomId);
        if (room) {
            room.readyPlayers = [];
        }
        
        // 通知房间内所有玩家重新开始
        io.to(roomId).emit('game-restart');
    });
    
    /**
     * 请求重新开始游戏
     */
    socket.on('request-restart', (data) => {
        const { roomId } = data;
        console.log(`客户端 ${socket.id} 请求重新开始游戏: 房间 ${roomId}`);
        
        const room = roomManager.getRoom(roomId);
        if (!room) {
            console.log(`房间 ${roomId} 不存在`);
            return;
        }
        
        // 记录请求重新开始的玩家
        if (!room.restartRequests) {
            room.restartRequests = [];
        }
        
        if (!room.restartRequests.includes(socket.id)) {
            room.restartRequests.push(socket.id);
            console.log(`房间 ${roomId} 重新开始请求者:`, room.restartRequests);
        }
        
        // 如果两个玩家都请求了重新开始
        if (room.restartRequests.length === 2) {
            console.log(`房间 ${roomId} 双方都同意重新开始`);
            
            // 清空请求列表
            room.restartRequests = [];
            room.readyPlayers = [];
            
            // 通知房间内所有玩家重新开始
            io.to(roomId).emit('game-restart');
        } else {
            // 通知对手有重新开始请求
            socket.to(roomId).emit('restart-request', {
                from: socket.id
            });
        }
    });
    
    /**
     * 同意重新开始游戏
     */
    socket.on('accept-restart', (data) => {
        const { roomId } = data;
        console.log(`客户端 ${socket.id} 同意重新开始游戏: 房间 ${roomId}`);
        
        const room = roomManager.getRoom(roomId);
        if (!room) {
            console.log(`房间 ${roomId} 不存在`);
            return;
        }
        
        // 记录同意重新开始的玩家
        if (!room.restartRequests) {
            room.restartRequests = [];
        }
        
        if (!room.restartRequests.includes(socket.id)) {
            room.restartRequests.push(socket.id);
            console.log(`房间 ${roomId} 同意重新开始的玩家:`, room.restartRequests);
        }
        
        // 如果两个玩家都同意了重新开始
        if (room.restartRequests.length === 2) {
            console.log(`房间 ${roomId} 双方都同意重新开始`);
            
            // 清空请求列表
            room.restartRequests = [];
            room.readyPlayers = [];
            
            // 通知房间内所有玩家重新开始
            io.to(roomId).emit('game-restart');
        }
    });
    
    /**
     * 请求悔棋
     */
    socket.on('request-undo', (data) => {
        const { roomId } = data;
        console.log(`客户端 ${socket.id} 请求悔棋: 房间 ${roomId}`);
        
        // 通知对手有悔棋请求
        socket.to(roomId).emit('undo-request', {
            from: socket.id
        });
    });
    
    /**
     * 同意悔棋
     */
    socket.on('accept-undo', (data) => {
        const { roomId } = data;
        console.log(`客户端 ${socket.id} 同意悔棋: 房间 ${roomId}`);
        
        // 通知房间内所有玩家悔棋
        io.to(roomId).emit('undo-move');
    });
    
    /**
     * 认输
     */
    socket.on('surrender', (data) => {
        const { roomId } = data;
        console.log(`客户端 ${socket.id} 认输: 房间 ${roomId}`);
        
        // 获取房间信息，确定谁赢了
        const room = roomManager.getRoom(roomId);
        if (room) {
            const opponentId = room.players.find(id => id !== socket.id);
            if (opponentId) {
                // 通知对手获胜
                const winnerColor = room.players.indexOf(opponentId) === 0 ? 1 : 2;
                socket.to(roomId).emit('opponent-surrender', {
                    winner: winnerColor
                });
            }
        }
    });
    
    /**
     * 断开连接事件处理
     */
    socket.on('disconnect', () => {
        console.log(`客户端断开连接: ${socket.id}`);
        
        const room = roomManager.leaveRoom(socket.id);
        
        if (room) {
            // 通知房间内其他玩家
            socket.to(room.id).emit('player-left', {
                playerId: socket.id
            });
            
            // 更新房间列表
            io.emit('room-list', roomManager.getRoomList());
        }
    });
});

/**
 * 定期清理超时房间
 * 每5分钟执行一次清理任务
 */
setInterval(() => {
    roomManager.cleanupRooms();
}, 5 * 60 * 1000);

/**
 * 启动服务器
 */
const PORT = process.env.PORT || 9001;
server.listen(PORT, () => {
    console.log(`清风月影Socket信令服务器启动成功`);
    console.log(`端口: ${PORT}`);
    console.log(`环境: ${process.env.NODE_ENV || 'development'}`);
    console.log(`WebSocket服务: ws://localhost:${PORT}`);
    console.log(`时间: ${new Date().toISOString()}`);
});

// 优雅关闭处理
process.on('SIGTERM', () => {
    console.log('收到SIGTERM信号，正在关闭服务器...');
    server.close(() => {
        console.log('服务器已关闭');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('收到SIGINT信号，正在关闭服务器...');
    server.close(() => {
        console.log('服务器已关闭');
        process.exit(0);
    });
});