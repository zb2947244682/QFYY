import { useEffect, useState } from 'react'
import { io, Socket } from 'socket.io-client'

/**
 * 首页在线人数统计Hook
 * 连接到独立的 /stats namespace，不影响游戏功能
 */
export const useOnlineStats = () => {
  const [onlineCount, setOnlineCount] = useState(0)
  const [isConnected, setIsConnected] = useState(false)
  const [socket, setSocket] = useState<Socket | null>(null)
  
  useEffect(() => {
    // 根据环境确定服务器地址
    let serverUrl: string
    
    if (import.meta.env.DEV) {
      // 开发环境连接本地Socket服务的stats namespace
      serverUrl = 'http://localhost:9001/stats'
    } else {
      // 生产环境连接独立Socket服务域名的stats namespace
      serverUrl = 'http://socket.qingfengyueying.xyz/stats'
    }
    
    console.log('[OnlineStats] 正在连接到:', serverUrl)
    
    // 创建Socket连接，连接到stats namespace
    const newSocket = io(serverUrl, {
      transports: ['websocket', 'polling'],
      upgrade: true,
      timeout: 10000,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    })
    
    // 连接成功
    newSocket.on('connect', () => {
      console.log('[OnlineStats] 连接成功, Socket ID:', newSocket.id)
      setIsConnected(true)
      
      // 请求当前在线人数
      newSocket.emit('get-online-count')
    })
    
    // 接收在线人数
    newSocket.on('online-count', (data: { count: number }) => {
      console.log('[OnlineStats] 收到在线人数:', data.count)
      setOnlineCount(data.count || 0)
    })
    
    // 在线人数更新
    newSocket.on('user-count-update', (data: { count: number }) => {
      console.log('[OnlineStats] 在线人数更新:', data.count)
      setOnlineCount(data.count || 0)
    })
    
    // 连接错误
    newSocket.on('connect_error', (error: Error) => {
      console.error('[OnlineStats] 连接错误:', error.message)
      setIsConnected(false)
    })
    
    // 断开连接
    newSocket.on('disconnect', (reason: string) => {
      console.log('[OnlineStats] 连接断开, 原因:', reason)
      setIsConnected(false)
      
      // 断开连接时不清零，保留最后的数据
      // 等待重连后再更新
    })
    
    // 重连成功
    newSocket.on('reconnect', (attemptNumber: number) => {
      console.log('[OnlineStats] 重连成功, 尝试次数:', attemptNumber)
      setIsConnected(true)
      
      // 重连后请求最新数据
      newSocket.emit('get-online-count')
    })
    
    // 重连失败
    newSocket.on('reconnect_failed', () => {
      console.error('[OnlineStats] 重连失败')
      setIsConnected(false)
      
      // 如果完全无法连接，显示模拟数据
      setOnlineCount(Math.floor(Math.random() * 30) + 5)
    })
    
    setSocket(newSocket)
    
    // 清理函数
    return () => {
      console.log('[OnlineStats] 清理Socket连接')
      if (newSocket) {
        newSocket.disconnect()
      }
    }
  }, [])
  
  return {
    onlineCount,
    isConnected,
    socket
  }
}

export default useOnlineStats