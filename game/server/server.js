// Node.js信令服务器
const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');
const crypto = require('crypto');

// 创建Express应用
const app = express();
const server = http.createServer(app);

// 配置Socket.IO，支持CORS
const io = socketIO(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// 健康检查
app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

// 房间管理
class RoomManager {
    constructor() {
        this.rooms = new Map(); // 存储所有房间
        this.playerRooms = new Map(); // 存储玩家所在的房间
    }
    
    // 生成房间ID
    generateRoomId() {
        return crypto.randomBytes(3).toString('hex').toUpperCase();
    }
    
    // 创建房间
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
    
    // 加入房间
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
    
    // 离开房间
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
    
    // 获取房间
    getRoom(roomId) {
        return this.rooms.get(roomId);
    }
    
    // 获取玩家所在房间
    getPlayerRoom(playerSocketId) {
        const roomId = this.playerRooms.get(playerSocketId);
        return roomId ? this.rooms.get(roomId) : null;
    }
    
    // 获取房间列表
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
    
    // 标记玩家准备
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
    
    // 清理超时房间
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

// 静态文件服务
// 在生产环境中，如果使用 Docker，静态文件由 Nginx 提供
// 在开发环境中，Vite 提供静态文件服务
if (process.env.NODE_ENV === 'production') {
    // 生产环境：提供构建后的文件（作为备份，主要由 Nginx 处理）
    const distPath = path.join(__dirname, '../dist');
    app.use(express.static(distPath));
    
    // 处理 React Router - 所有路由返回 index.html
    app.get('*', (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
    });
}

// Socket.IO连接处理
io.on('connection', (socket) => {
    console.log(`客户端连接: ${socket.id}`);
    
    // 创建房间
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
    
    // 加入房间
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
    
    // 离开房间
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
    
    // 获取房间列表
    socket.on('get-rooms', () => {
        console.log(`客户端 ${socket.id} 请求房间列表`);
        socket.emit('room-list', roomManager.getRoomList());
    });
    
    // WebRTC Offer
    socket.on('webrtc-offer', (data) => {
        const { roomId, offer } = data;
        socket.to(roomId).emit('webrtc-offer', {
            offer: offer,
            from: socket.id
        });
    });
    
    // WebRTC Answer
    socket.on('webrtc-answer', (data) => {
        const { roomId, answer } = data;
        socket.to(roomId).emit('webrtc-answer', {
            answer: answer,
            from: socket.id
        });
    });
    
    // ICE候选
    socket.on('ice-candidate', (data) => {
        const { roomId, candidate } = data;
        socket.to(roomId).emit('ice-candidate', {
            candidate: candidate,
            from: socket.id
        });
    });
    
    // 玩家准备
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
            
            console.log(`游戏开始: 房间 ${room.id}`);
        }
    });
    
    // 落子事件
    socket.on('make-move', (data) => {
        const { roomId, row, col } = data;
        console.log(`客户端 ${socket.id} 落子: 房间 ${roomId}, 位置 (${row}, ${col})`);
        
        // 转发给房间内的其他玩家
        socket.to(roomId).emit('opponent-move', {
            row: row,
            col: col
        });
    });
    
    // 重新开始游戏
    socket.on('restart-game', (data) => {
        const { roomId } = data;
        console.log(`客户端 ${socket.id} 请求重新开始游戏: 房间 ${roomId}`);
        
        // 通知房间内所有玩家重新开始
        io.to(roomId).emit('game-restart');
    });
    
    // 断开连接
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

// 定期清理超时房间
setInterval(() => {
    roomManager.cleanupRooms();
}, 5 * 60 * 1000); // 每5分钟清理一次

// 启动服务器
const PORT = process.env.PORT || 8569;
server.listen(PORT, () => {
    console.log(`信令服务器运行在端口 ${PORT}`);
    console.log(`环境: ${process.env.NODE_ENV || 'development'}`);
    if (process.env.NODE_ENV === 'production') {
        console.log(`访问 http://localhost:${PORT} 打开游戏`);
    } else {
        console.log(`开发环境: 前端运行在 http://localhost:5173`);
        console.log(`WebSocket服务: http://localhost:${PORT}`);
    }
});