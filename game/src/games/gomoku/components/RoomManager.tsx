import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useSocket } from '../hooks/useSocket'
import { useGomokuStore } from '../store/gameStore'

interface Room {
  id: string
  playerCount: number
  createdAt: number
}

interface RoomManagerProps {
  onJoinRoom: () => void
}

const RoomManager = ({ onJoinRoom }: RoomManagerProps) => {
  const [roomIdInput, setRoomIdInput] = useState('')
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(false)
  
  const { socket, connected } = useSocket()
  const { setRoomInfo, setUserRole, generateRandomNickname, setMyNickname } = useGomokuStore()

  // 调试连接状态
  console.log('RoomManager - connected:', connected, 'socket:', socket)

  useEffect(() => {
    if (!socket) return

    // 监听房间列表
    socket.on('room-list', (roomList: Room[]) => {
      setRooms(roomList)
    })

    // 房间创建成功
    socket.on('room-created', (data: { roomId: string, isHost: boolean }) => {
      // 生成并设置随机昵称
      const nickname = generateRandomNickname()
      setMyNickname(nickname)
      
      // 发送昵称到服务器
      socket.emit('set-nickname', { roomId: data.roomId, nickname })
      
      setRoomInfo(data.roomId, data.isHost)
      setUserRole('player')
      onJoinRoom()
      setLoading(false)
    })

    // 加入房间成功  
    socket.on('room-joined', (data: { roomId: string, isHost: boolean }) => {
      // 生成并设置随机昵称
      const nickname = generateRandomNickname()
      setMyNickname(nickname)
      
      // 发送昵称到服务器
      socket.emit('set-nickname', { roomId: data.roomId, nickname })
      
      setRoomInfo(data.roomId, data.isHost)
      setUserRole('player')
      onJoinRoom()
      setLoading(false)
    })
    
    // 以观众身份加入成功
    socket.on('spectator-joined', (data: { roomId: string, isHost: boolean }) => {
      // 观众也生成昵称
      const nickname = generateRandomNickname()
      setMyNickname(nickname)
      
      // 发送昵称到服务器
      socket.emit('set-nickname', { roomId: data.roomId, nickname })
      
      setRoomInfo(data.roomId, false)
      setUserRole('spectator')
      onJoinRoom()
      setLoading(false)
    })

    // 房间错误
    socket.on('room-error', (error: { message: string }) => {
      console.error('房间操作错误:', error.message)
      // 使用游戏内通知系统代替alert
      const { addNotification } = useGomokuStore.getState()
      addNotification('error', `❌ ${error.message}`)
      setLoading(false)
    })

    // 请求房间列表
    socket.emit('get-rooms')

    return () => {
      socket.off('room-list')
      socket.off('room-created')
      socket.off('room-joined')
      socket.off('spectator-joined')
      socket.off('room-error')
    }
  }, [socket, onJoinRoom, setRoomInfo, setUserRole, generateRandomNickname, setMyNickname])

  const handleCreateRoom = () => {
    if (!socket || !connected) {
      alert('未连接到服务器')
      return
    }
    if (loading) {
      console.log('操作进行中，请稍候')
      return
    }
    setLoading(true)
    socket.emit('create-room')
  }

  const handleJoinRoom = (roomId?: string) => {
    const id = roomId || roomIdInput.trim()
    if (!id) {
      alert('请输入房间ID')
      return
    }
    if (!socket || !connected) {
      alert('未连接到服务器')
      return
    }
    if (loading) {
      console.log('操作进行中，请稍候')
      return
    }
    setLoading(true)
    socket.emit('join-room', { roomId: id })
  }
  
  const handleSpectate = (roomId?: string) => {
    const id = roomId || roomIdInput.trim()
    if (!id) {
      alert('请输入房间ID')
      return
    }
    if (!socket || !connected) {
      alert('未连接到服务器')
      return
    }
    if (loading) {
      console.log('操作进行中，请稍候')
      return
    }
    setLoading(true)
    socket.emit('join-as-spectator', { roomId: id })
  }

  return (
    <div className="space-y-3">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <h2 className="text-lg sm:text-xl font-game font-bold text-white">
          五子棋房间管理
        </h2>
        <p className="text-gray-400 text-xs sm:text-sm">
          创建新房间或加入现有房间开始游戏
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="bg-gray-800 rounded-lg p-3 sm:p-4 space-y-2"
      >
        {/* 创建房间 */}
        <div className="space-y-1.5">
          <h3 className="text-sm font-game text-purple-400">创建新房间</h3>
          <button
            onClick={handleCreateRoom}
            disabled={loading || !connected}
            className="w-full pixel-btn bg-purple-600 hover:bg-purple-700 py-1.5 text-xs sm:text-sm"
          >
            {loading ? '创建中...' : '创建房间'}
          </button>
        </div>

        <div className="border-t border-gray-700"></div>

        {/* 加入房间 */}
        <div className="space-y-1.5">
          <h3 className="text-sm font-game text-pink-400">加入房间</h3>
          <div className="flex flex-col gap-2">
            <input
              type="text"
              value={roomIdInput}
              onChange={(e) => setRoomIdInput(e.target.value.toUpperCase())}
              onKeyPress={(e) => e.key === 'Enter' && handleJoinRoom()}
              placeholder="输入房间ID"
              className="w-full px-2 py-1 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-pink-400 focus:outline-none text-xs sm:text-sm"
              maxLength={6}
            />
            <div className="flex gap-2">
              <button
                onClick={() => handleJoinRoom()}
                disabled={loading || !connected}
                className="flex-1 pixel-btn bg-pink-600 hover:bg-pink-700 py-1 px-3 text-xs sm:text-sm"
              >
                加入游戏
              </button>
              <button
                onClick={() => handleSpectate()}
                disabled={loading || !connected}
                className="flex-1 pixel-btn bg-yellow-600 hover:bg-yellow-700 py-1 px-3 text-xs sm:text-sm"
              >
                观战
              </button>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-700"></div>

        {/* 可用房间列表 */}
        <div className="space-y-1.5">
          <h3 className="text-sm font-game text-blue-400">可用房间</h3>
          <div className="space-y-1 max-h-32 sm:max-h-40 overflow-y-auto custom-scrollbar">
            {rooms.length === 0 ? (
              <p className="text-gray-500 text-center py-2 text-xs sm:text-sm">暂无可用房间</p>
            ) : (
              rooms.map((room) => (
                <motion.div
                  key={room.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center justify-between p-1.5 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
                >
                  <div>
                    <span className="font-pixel text-yellow-400 text-xs sm:text-sm">
                      {room.id}
                    </span>
                    <span className="ml-2 text-xs text-gray-400">
                      {room.playerCount}/2 玩家
                    </span>
                  </div>
                  <div className="flex gap-1">
                    {room.playerCount < 2 && (
                      <button
                        onClick={() => handleJoinRoom(room.id)}
                        disabled={loading}
                        className="px-2 py-0.5 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors"
                      >
                        加入
                      </button>
                    )}
                    <button
                      onClick={() => handleSpectate(room.id)}
                      disabled={loading}
                      className="px-2 py-0.5 bg-yellow-600 hover:bg-yellow-700 text-white text-xs rounded transition-colors"
                    >
                      观战
                    </button>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </motion.div>

      {/* 连接状态 */}
      <div className="text-center">
        <span className={`text-xs ${connected ? 'text-green-400' : 'text-red-400'}`}>
          {connected ? '✓ 已连接到服务器' : '✗ 未连接到服务器'}
        </span>
      </div>
    </div>
  )
}

export default RoomManager