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
 * 创建独立的namespace用于首页在线人数统计
 * 这个namespace只负责统计访问首页的用户数量，不包括游戏内的连接
 */
const statsNamespace = io.of('/stats');
let homePageUsers = 0; // 首页在线用户计数

// 首页统计namespace的连接处理
statsNamespace.on('connection', (socket) => {
    console.log(`[Stats] 新用户连接到首页: ${socket.id}`);
    
    // 增加首页在线人数
    homePageUsers++;
    console.log(`[Stats] 当前首页在线人数: ${homePageUsers}`);
    
    // 发送当前在线人数给新连接的用户
    socket.emit('online-count', { count: homePageUsers });
    
    // 广播更新后的在线人数给所有连接的用户
    statsNamespace.emit('user-count-update', { count: homePageUsers });
    
    // 处理获取在线人数请求
    socket.on('get-online-count', () => {
        console.log(`[Stats] 用户 ${socket.id} 请求在线人数`);
        socket.emit('online-count', { count: homePageUsers });
    });
    
    // 处理断开连接
    socket.on('disconnect', (reason) => {
        console.log(`[Stats] 用户断开首页连接: ${socket.id}, 原因: ${reason}`);
        
        // 减少首页在线人数
        homePageUsers--;
        if (homePageUsers < 0) homePageUsers = 0; // 防止负数
        
        console.log(`[Stats] 当前首页在线人数: ${homePageUsers}`);
        
        // 广播更新后的在线人数
        statsNamespace.emit('user-count-update', { count: homePageUsers });
    });
    
    // 处理错误
    socket.on('error', (error) => {
        console.error(`[Stats] Socket错误: ${error}`);
    });
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
            spectators: [], // 观众列表
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
        // 检查用户是否已经在其他房间
        const existingRoomId = this.playerRooms.get(playerSocketId);
        if (existingRoomId) {
            if (existingRoomId === roomId) {
                console.log(`用户已在目标房间中: ${playerSocketId} in ${roomId}`);
                return { success: false, error: '已在该房间中' };
            } else {
                console.log(`用户在其他房间中，先离开: ${playerSocketId} from ${existingRoomId}`);
                // 自动离开当前房间
                this.leaveRoom(playerSocketId);
            }
        }
        
        const room = this.rooms.get(roomId);
        
        if (!room) {
            console.log(`房间不存在: ${roomId}`);
            return { success: false, error: '房间不存在' };
        }
        
        // 再次检查是否已经在房间中（作为玩家或观众）
        if (room.players.includes(playerSocketId) || room.spectators.includes(playerSocketId)) {
            console.log(`用户已在房间中: ${playerSocketId} in ${roomId}`);
            return { success: false, error: '已在房间中' };
        }
        
        if (room.players.length >= 2) {
            console.log(`房间已满: ${roomId}, 当前玩家数: ${room.players.length}`);
            return { success: false, error: '房间已满' };
        }
        
        room.players.push(playerSocketId);
        this.playerRooms.set(playerSocketId, roomId);
        
        console.log(`玩家 ${playerSocketId} 加入房间 ${roomId}`);
        console.log(`房间 ${roomId} 当前状态:`, room);
        
        return { success: true, room, role: 'player' };
    }
    
    /**
     * 以观众身份加入房间
     * @param {string} roomId - 房间ID
     * @param {string} spectatorSocketId - 观众的Socket ID
     * @returns {Object} 加入结果
     */
    joinAsSpectator(roomId, spectatorSocketId) {
        // 检查用户是否已经在其他房间
        const existingRoomId = this.playerRooms.get(spectatorSocketId);
        if (existingRoomId) {
            if (existingRoomId === roomId) {
                console.log(`用户已在目标房间中: ${spectatorSocketId} in ${roomId}`);
                return { success: false, error: '已在该房间中' };
            } else {
                console.log(`用户在其他房间中，先离开: ${spectatorSocketId} from ${existingRoomId}`);
                // 自动离开当前房间
                this.leaveRoom(spectatorSocketId);
            }
        }
        
        const room = this.rooms.get(roomId);
        
        if (!room) {
            console.log(`房间不存在: ${roomId}`);
            return { success: false, error: '房间不存在' };
        }
        
        // 再次检查是否已经在房间中
        if (room.players.includes(spectatorSocketId) || room.spectators.includes(spectatorSocketId)) {
            console.log(`用户已在房间中: ${spectatorSocketId} in ${roomId}`);
            return { success: false, error: '已在房间中' };
        }
        
        room.spectators.push(spectatorSocketId);
        this.playerRooms.set(spectatorSocketId, roomId);
        
        console.log(`观众 ${spectatorSocketId} 加入房间 ${roomId}`);
        console.log(`房间 ${roomId} 当前观众:`, room.spectators);
        
        return { success: true, room, role: 'spectator' };
    }
    
    /**
     * 从观众转换为玩家
     * @param {string} socketId - Socket ID
     * @returns {Object} 转换结果
     */
    spectatorToPlayer(socketId) {
        const roomId = this.playerRooms.get(socketId);
        if (!roomId) {
            console.log(`spectatorToPlayer失败: ${socketId} 不在任何房间中`);
            return { success: false, error: '不在任何房间中' };
        }
        
        const room = this.rooms.get(roomId);
        if (!room) {
            console.log(`spectatorToPlayer失败: 房间 ${roomId} 不存在`);
            // 清理无效的映射
            this.playerRooms.delete(socketId);
            return { success: false, error: '房间不存在' };
        }
        
        // 检查是否是观众
        if (!room.spectators.includes(socketId)) {
            // 可能是玩家
            if (room.players.includes(socketId)) {
                console.log(`spectatorToPlayer失败: ${socketId} 已经是玩家`);
                return { success: false, error: '已经是玩家' };
            }
            console.log(`spectatorToPlayer失败: ${socketId} 不是观众`);
            return { success: false, error: '不是观众' };
        }
        
        // 检查房间是否有空位
        if (room.players.length >= 2) {
            console.log(`spectatorToPlayer失败: 房间 ${roomId} 已满`);
            return { success: false, error: '房间已满' };
        }
        
        // 从观众列表移除，添加到玩家列表
        room.spectators = room.spectators.filter(id => id !== socketId);
        room.players.push(socketId);
        
        console.log(`观众 ${socketId} 转换为玩家，房间 ${roomId}`);
        console.log(`房间 ${roomId} 当前状态:`, room);
        
        return { success: true, room };
    }
    
    /**
     * 从玩家转换为观众（认输）
     * @param {string} socketId - Socket ID
     * @returns {Object} 转换结果
     */
    playerToSpectator(socketId) {
        const roomId = this.playerRooms.get(socketId);
        if (!roomId) {
            console.log(`playerToSpectator失败: ${socketId} 不在任何房间中`);
            return { success: false, error: '不在任何房间中' };
        }
        
        const room = this.rooms.get(roomId);
        if (!room) {
            console.log(`playerToSpectator失败: 房间 ${roomId} 不存在`);
            // 清理无效的映射
            this.playerRooms.delete(socketId);
            return { success: false, error: '房间不存在' };
        }
        
        // 检查是否是玩家
        if (!room.players.includes(socketId)) {
            // 可能已经是观众
            if (room.spectators.includes(socketId)) {
                console.log(`playerToSpectator失败: ${socketId} 已经是观众`);
                return { success: false, error: '已经是观众' };
            }
            console.log(`playerToSpectator失败: ${socketId} 不是玩家`);
            return { success: false, error: '不是玩家' };
        }
        
        // 从玩家列表移除，添加到观众列表
        room.players = room.players.filter(id => id !== socketId);
        room.readyPlayers = room.readyPlayers.filter(id => id !== socketId);
        room.spectators.push(socketId);
        
        // 如果原来是房主，转移房主权限
        if (room.host === socketId && room.players.length > 0) {
            room.host = room.players[0];
            console.log(`房间 ${roomId} 房主转移至 ${room.host}`);
        }
        
        console.log(`玩家 ${socketId} 转换为观众，房间 ${roomId}`);
        console.log(`房间 ${roomId} 当前状态:`, room);
        
        // 返回对手信息（用于判定胜负）
        const opponent = room.players.find(id => id !== socketId);
        return { success: true, room, opponent };
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
            // 移除玩家或观众
            const wasPlayer = room.players.includes(playerSocketId);
            room.players = room.players.filter(id => id !== playerSocketId);
            room.spectators = room.spectators.filter(id => id !== playerSocketId);
            room.readyPlayers = room.readyPlayers.filter(id => id !== playerSocketId);
            
            // 清理重新开始请求
            if (room.restartRequests) {
                room.restartRequests = room.restartRequests.filter(id => id !== playerSocketId);
            }
            
            console.log(`${wasPlayer ? '玩家' : '观众'} ${playerSocketId} 离开房间 ${roomId}`);
            console.log(`房间 ${roomId} 剩余玩家:`, room.players);
            console.log(`房间 ${roomId} 剩余观众:`, room.spectators);
            
            // 如果房间为空，删除房间
            if (room.players.length === 0 && room.spectators.length === 0) {
                this.rooms.delete(roomId);
                console.log(`房间 ${roomId} 已删除`);
            } else if (room.host === playerSocketId && room.players.length > 0) {
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
            if (now - room.createdAt > timeout && room.players.length === 0 && room.spectators.length === 0) {
                this.rooms.delete(roomId);
                console.log(`清理超时房间: ${roomId}`);
            }
        });
    }
}

// 创建房间管理器实例
const roomManager = new RoomManager();

// 游戏玩家计数（仅用于游戏内统计，不影响首页显示）
let gamePlayersCount = 0;

/**
 * 游戏默认namespace的Socket.IO连接处理
 * 用于处理五子棋等游戏的连接
 */
io.on('connection', (socket) => {
    console.log(`[Game] 游戏客户端连接: ${socket.id}`);
    
    // 增加游戏玩家数
    gamePlayersCount++;
    console.log(`[Game] 当前游戏玩家数: ${gamePlayersCount}`);
    
    // 不再广播给首页，仅用于游戏内部统计
    // io.emit('user-count-update', { count: gamePlayersCount });
    
    /**
     * 游戏内获取在线人数事件处理（已废弃，改用stats namespace）
     * 保留此事件处理以兼容旧版本，但不再使用
     */
    socket.on('get-online-count', () => {
        console.log(`[Game] 警告：游戏客户端 ${socket.id} 使用了废弃的get-online-count事件`);
        // 不再响应此事件，首页应该使用stats namespace
    });
    
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
     * 以观众身份加入房间事件处理
     */
    socket.on('join-as-spectator', (data) => {
        const { roomId } = data;
        console.log(`客户端 ${socket.id} 请求以观众身份加入房间 ${roomId}`);
        
        const result = roomManager.joinAsSpectator(roomId, socket.id);
        
        if (result.success) {
            socket.join(roomId);
            socket.emit('spectator-joined', {
                roomId: roomId,
                isHost: false
            });
            
            console.log(`客户端 ${socket.id} 以观众身份加入房间成功`);
            
            // 通知房间内所有玩家有观众加入
            socket.to(roomId).emit('spectator-joined', {
                spectatorId: socket.id
            });
            
            // 更新房间列表
            io.emit('room-list', roomManager.getRoomList());
        } else {
            console.log(`客户端 ${socket.id} 以观众身份加入房间失败: ${result.error}`);
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
     * Socket离开房间事件处理（额外的清理）
     */
    socket.on('socket-leave-room', (data) => {
        if (data.roomId) {
            console.log(`Socket ${socket.id} 离开房间 ${data.roomId}`);
            socket.leave(data.roomId);
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
     * 语音频道相关事件处理
     */
    
    // 加入语音频道
    socket.on('join-voice-channel', (data) => {
        const { roomId } = data;
        console.log(`用户 ${socket.id} 加入语音频道: 房间 ${roomId}`);
        
        // 通知房间内其他用户
        socket.to(roomId).emit('user-joined-voice', {
            userId: socket.id
        });
        
        // 标记用户已加入语音频道
        if (!socket.voiceChannels) {
            socket.voiceChannels = new Set();
        }
        socket.voiceChannels.add(roomId);
    });
    
    // 离开语音频道
    socket.on('leave-voice-channel', (data) => {
        const { roomId } = data;
        console.log(`用户 ${socket.id} 离开语音频道: 房间 ${roomId}`);
        
        // 通知房间内其他用户
        socket.to(roomId).emit('user-left-voice', {
            userId: socket.id
        });
        
        // 移除语音频道标记
        if (socket.voiceChannels) {
            socket.voiceChannels.delete(roomId);
        }
    });
    
    // 语音Offer
    socket.on('voice-offer', (data) => {
        const { roomId, offer, targetPeerId } = data;
        console.log(`转发语音Offer: 房间 ${roomId}, ${socket.id} -> ${targetPeerId}`);
        
        io.to(targetPeerId).emit('voice-offer', {
            offer: offer,
            fromPeerId: socket.id
        });
    });
    
    // 语音Answer
    socket.on('voice-answer', (data) => {
        const { roomId, answer, targetPeerId } = data;
        console.log(`转发语音Answer: 房间 ${roomId}, ${socket.id} -> ${targetPeerId}`);
        
        io.to(targetPeerId).emit('voice-answer', {
            answer: answer,
            fromPeerId: socket.id
        });
    });
    
    // 语音ICE候选
    socket.on('voice-ice-candidate', (data) => {
        const { roomId, candidate, targetPeerId } = data;
        console.log(`转发语音ICE候选: 房间 ${roomId}, ${socket.id} -> ${targetPeerId}`);
        
        io.to(targetPeerId).emit('voice-ice-candidate', {
            candidate: candidate,
            fromPeerId: socket.id
        });
    });
    
    /**
     * 玩家准备事件处理
     */
    socket.on('ready-to-play', (data) => {
        console.log(`客户端 ${socket.id} 准备开始游戏`);
        const room = roomManager.markPlayerReady(socket.id);
        
        if (room) {
            // 标记游戏已开始
            room.gameStarted = true;
            
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
            
            // 通知所有观众游戏开始
            room.spectators.forEach(spectatorId => {
                io.to(spectatorId).emit('game-start-spectator', {
                    blackPlayer: players[blackIndex],
                    whitePlayer: players[whiteIndex]
                });
            });
            
            console.log(`游戏开始通知已发送: 房间 ${room.id}`);
        }
    });
    
    /**
     * 从观众转换为玩家事件处理
     */
    socket.on('spectator-to-player', () => {
        console.log(`观众 ${socket.id} 请求转换为玩家`);
        
        const result = roomManager.spectatorToPlayer(socket.id);
        
        if (result.success) {
            const room = result.room;
            
            socket.emit('role-changed', {
                role: 'player',
                roomId: room.id
            });
            
            // 通知房间内其他人
            socket.to(room.id).emit('user-role-changed', {
                userId: socket.id,
                role: 'player'
            });
            
            console.log(`观众 ${socket.id} 成功转换为玩家`);
            
            // 如果房间现在有2个玩家，自动准备游戏
            if (room.players.length === 2) {
                socket.emit('ready-prompt');
            }
        } else {
            socket.emit('role-change-error', {
                message: result.error
            });
        }
    });
    
    /**
     * 从玩家转换为观众（到观众席/认输）事件处理
     */
    socket.on('player-to-spectator', () => {
        console.log(`玩家 ${socket.id} 请求转换为观众`);
        
        const room = roomManager.getPlayerRoom(socket.id);
        const gameInProgress = room && room.gameStarted; // 假设有游戏状态标记
        
        const result = roomManager.playerToSpectator(socket.id);
        
        if (result.success) {
            const room = result.room;
            
            socket.emit('role-changed', {
                role: 'spectator',
                roomId: room.id
            });
            
            // 如果游戏正在进行中，这相当于认输
            if (gameInProgress && result.opponent) {
                // 通知对手获胜
                io.to(result.opponent).emit('opponent-surrender', {
                    winner: room.players.indexOf(result.opponent) === 0 ? 1 : 2
                });
                
                // 通知所有观众游戏结果
                room.spectators.forEach(spectatorId => {
                    if (spectatorId !== socket.id) {
                        io.to(spectatorId).emit('game-ended-by-surrender', {
                            winnerId: result.opponent,
                            surrenderId: socket.id
                        });
                    }
                });
            }
            
            // 通知房间内其他人
            socket.to(room.id).emit('user-role-changed', {
                userId: socket.id,
                role: 'spectator',
                wasSurrender: gameInProgress
            });
            
            console.log(`玩家 ${socket.id} 成功转换为观众`);
        } else {
            socket.emit('role-change-error', {
                message: result.error
            });
        }
    });
    
    /**
     * 落子事件处理（修改以支持观众观看）
     */
    socket.on('make-move', (data) => {
        const { roomId, row, col } = data;
        const room = roomManager.getRoom(roomId);
        
        if (!room) {
            console.log(`落子失败：房间 ${roomId} 不存在`);
            return;
        }
        
        // 只有玩家可以落子
        if (!room.players.includes(socket.id)) {
            console.log(`落子失败：${socket.id} 不是玩家`);
            socket.emit('move-error', { message: '观众不能落子' });
            return;
        }
        
        console.log(`落子: 房间 ${roomId}, 玩家 ${socket.id}, 位置 (${row}, ${col})`);
        
        // 广播给对手
        const opponent = room.players.find(p => p !== socket.id);
        if (opponent) {
            io.to(opponent).emit('opponent-move', { row, col });
        }
        
        // 广播给所有观众
        room.spectators.forEach(spectatorId => {
            io.to(spectatorId).emit('game-move', { 
                row, 
                col, 
                playerId: socket.id 
            });
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
     * 同意重新开始
     */
    socket.on('accept-restart', (data) => {
        const { roomId } = data;
        console.log(`客户端 ${socket.id} 同意重新开始: 房间 ${roomId}`);
        
        // 通知所有玩家游戏重新开始
        io.to(roomId).emit('game-restart');
    });
    
    /**
     * 拒绝重新开始
     */
    socket.on('reject-restart', (data) => {
        const { roomId } = data;
        console.log(`客户端 ${socket.id} 拒绝重新开始: 房间 ${roomId}`);
        
        // 通知请求方被拒绝
        socket.to(roomId).emit('restart-rejected');
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
        
        // 通知所有玩家执行悔棋
        io.to(roomId).emit('undo-move');
    });
    
    /**
     * 拒绝悔棋
     */
    socket.on('reject-undo', (data) => {
        const { roomId } = data;
        console.log(`客户端 ${socket.id} 拒绝悔棋: 房间 ${roomId}`);
        
        // 通知请求方被拒绝
        socket.to(roomId).emit('undo-rejected');
    });
    
    /**
     * 认输
     */
    socket.on('surrender', (data) => {
        const { roomId, surrenderColor } = data;
        console.log(`客户端 ${socket.id} 认输: 房间 ${roomId}, 认输方颜色 ${surrenderColor}`);
        
        // 计算赢家颜色（对方的颜色）
        const winnerColor = surrenderColor === 1 ? 2 : 1;
        
        // 通知对手获胜
        socket.to(roomId).emit('opponent-surrender', {
            winner: winnerColor
        });
    });
    
    /**
     * 聊天消息事件处理（支持玩家和观众）
     */
    socket.on('chat-message', (data) => {
        const { roomId, message } = data;
        const room = roomManager.getRoom(roomId);
        
        if (!room) {
            console.log(`聊天失败：房间 ${roomId} 不存在`);
            return;
        }
        
        // 检查发送者是否在房间中（玩家或观众）
        const isInRoom = room.players.includes(socket.id) || room.spectators.includes(socket.id);
        
        if (!isInRoom) {
            console.log(`聊天失败：${socket.id} 不在房间 ${roomId} 中`);
            return;
        }
        
        const isSpectator = room.spectators.includes(socket.id);
        
        console.log(`${isSpectator ? '观众' : '玩家'} ${socket.id} 发送聊天消息: ${message}`);
        
        // 广播消息给房间内所有人（包括玩家和观众）
        socket.to(roomId).emit('chat-message', {
            message: message,
            from: socket.id,
            isSpectator: isSpectator
        });
    });
    
    /**
     * 井字棋游戏事件处理
     */
    
    // 创建井字棋房间
    socket.on('ttt-create-room', () => {
        console.log(`[TicTacToe] 创建房间请求: ${socket.id}`);
        
        const room = roomManager.createRoom(socket.id);
        socket.join(room.id);
        
        socket.emit('ttt-room-created', {
            roomId: room.id,
            isHost: true
        });
        
        console.log(`[TicTacToe] 房间创建成功: ${room.id}`);
    });
    
    // 加入井字棋房间
    socket.on('ttt-join-room', (data) => {
        const { roomId } = data;
        console.log(`[TicTacToe] 加入房间请求: ${socket.id} -> ${roomId}`);
        
        const result = roomManager.joinRoom(roomId, socket.id);
        
        if (result.success) {
            socket.join(roomId);
            socket.emit('ttt-room-joined', {
                roomId: roomId,
                isHost: false
            });
            
            // 通知房主有人加入
            const room = result.room;
            socket.to(room.host).emit('ttt-player-joined', {
                playerId: socket.id
            });
            
            // 如果房间满了，开始游戏
            if (room.players.length === 2) {
                // 随机分配X和O
                const symbols = Math.random() < 0.5 ? ['X', 'O'] : ['O', 'X'];
                
                io.to(room.players[0]).emit('ttt-game-start', {
                    playerSymbol: symbols[0],
                    opponentId: room.players[1]
                });
                
                io.to(room.players[1]).emit('ttt-game-start', {
                    playerSymbol: symbols[1],
                    opponentId: room.players[0]
                });
                
                console.log(`[TicTacToe] 游戏开始: 房间 ${roomId}`);
            }
        } else {
            socket.emit('ttt-error', { message: result.error });
        }
    });
    
    // 井字棋落子
    socket.on('ttt-make-move', (data) => {
        const { roomId, row, col } = data;
        console.log(`[TicTacToe] 落子: ${socket.id} 在 [${row}, ${col}]`);
        
        // 转发给对手
        socket.to(roomId).emit('ttt-opponent-move', { row, col });
    });
    
    // 井字棋请求重新开始
    socket.on('ttt-request-restart', (data) => {
        const { roomId } = data;
        console.log(`[TicTacToe] 请求重新开始: ${socket.id}`);
        
        socket.to(roomId).emit('ttt-restart-request');
    });
    
    // 井字棋同意重新开始
    socket.on('ttt-accept-restart', (data) => {
        const { roomId } = data;
        console.log(`[TicTacToe] 同意重新开始: ${socket.id}`);
        
        // 重新分配符号
        const room = roomManager.rooms.get(roomId);
        if (room && room.players.length === 2) {
            const symbols = Math.random() < 0.5 ? ['X', 'O'] : ['O', 'X'];
            
            io.to(room.players[0]).emit('ttt-game-restart');
            io.to(room.players[0]).emit('ttt-game-start', {
                playerSymbol: symbols[0],
                opponentId: room.players[1]
            });
            
            io.to(room.players[1]).emit('ttt-game-restart');
            io.to(room.players[1]).emit('ttt-game-start', {
                playerSymbol: symbols[1],
                opponentId: room.players[0]
            });
        }
    });
    
    // 井字棋拒绝重新开始
    socket.on('ttt-reject-restart', (data) => {
        const { roomId } = data;
        console.log(`[TicTacToe] 拒绝重新开始: ${socket.id}`);
        
        socket.to(roomId).emit('ttt-restart-rejected');
    });
    
    // 井字棋离开房间
    socket.on('ttt-leave-room', (data) => {
        const { roomId } = data;
        console.log(`[TicTacToe] 离开房间: ${socket.id}`);
        
        socket.to(roomId).emit('ttt-player-left', {
            playerId: socket.id
        });
        
        roomManager.leaveRoom(socket.id);  // 修复：只传入 socket.id
        socket.leave(roomId);
    });
    
    /**
     * 断开连接事件处理
     */
    socket.on('disconnect', () => {
        console.log(`[Game] 游戏客户端断开连接: ${socket.id}`);
        
        // 减少游戏玩家数
        gamePlayersCount--;
        if (gamePlayersCount < 0) gamePlayersCount = 0;
        console.log(`[Game] 当前游戏玩家数: ${gamePlayersCount}`);
        
        // 清理语音频道
        if (socket.voiceChannels && socket.voiceChannels.size > 0) {
            socket.voiceChannels.forEach(roomId => {
                console.log(`清理语音频道: 用户 ${socket.id} 从房间 ${roomId} 离开`);
                socket.to(roomId).emit('user-left-voice', {
                    userId: socket.id
                });
            });
            socket.voiceChannels.clear();
        }
        
        // 不再广播给首页
        // io.emit('user-count-update', { count: gamePlayersCount });
        
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