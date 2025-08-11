import { useEffect, useRef, useState } from 'react'
import { useSocket } from './useSocket'
import { useGomokuStore } from '../store/gameStore'

export const useWebRTC = () => {
  const [connectionState, setConnectionState] = useState<RTCPeerConnectionState>('new')
  const peerConnection = useRef<RTCPeerConnection | null>(null)
  const dataChannel = useRef<RTCDataChannel | null>(null)
  
  const { socket } = useSocket()
  const { roomId, isHost } = useGomokuStore()

  useEffect(() => {
    if (!socket || !roomId) return

    const initWebRTC = async () => {
      // ICE服务器配置
      const iceServers = {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      }

      // 创建RTCPeerConnection
      const pc = new RTCPeerConnection(iceServers)
      peerConnection.current = pc

      // 监听ICE候选
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('ice-candidate', {
            roomId,
            candidate: event.candidate
          })
        }
      }

      // 监听连接状态变化
      pc.onconnectionstatechange = () => {
        console.log('Connection state:', pc.connectionState)
        setConnectionState(pc.connectionState)
        
        if (pc.connectionState === 'connected') {
          // 连接成功，通知服务器
          socket.emit('ready-to-play', { roomId })
        }
      }

      // 如果是房主，创建数据通道
      if (isHost) {
        const channel = pc.createDataChannel('gameData', { ordered: true })
        dataChannel.current = channel
        setupDataChannel(channel)
        
        // 创建offer
        const offer = await pc.createOffer()
        await pc.setLocalDescription(offer)
        
        socket.emit('webrtc-offer', {
          roomId,
          offer
        })
      } else {
        // 如果是加入者，等待数据通道
        pc.ondatachannel = (event) => {
          const channel = event.channel
          dataChannel.current = channel
          setupDataChannel(channel)
        }
      }
    }

    const setupDataChannel = (channel: RTCDataChannel) => {
      channel.onopen = () => {
        console.log('Data channel opened')
      }

      channel.onclose = () => {
        console.log('Data channel closed')
      }

      channel.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          handleMessage(data)
        } catch (error) {
          console.error('Failed to parse message:', error)
        }
      }
    }

    const handleMessage = (data: any) => {
      console.log('Received message:', data)
      
      if (data.type === 'move') {
        // 处理对手的落子
        const store = useGomokuStore.getState()
        const newBoard = [...store.board]
        newBoard[data.row][data.col] = store.currentPlayer
        
        const isWin = store.checkWin(data.row, data.col, store.currentPlayer)
        
        useGomokuStore.setState({
          board: newBoard,
          lastMove: { row: data.row, col: data.col },
          currentPlayer: store.currentPlayer === 1 ? 2 : 1,
          winner: isWin ? store.currentPlayer : null,
          gameState: isWin ? 'finished' : 'playing'
        })
      }
    }

    // 监听WebRTC信令
    socket.on('webrtc-offer', async (data: any) => {
      if (!peerConnection.current) return
      
      await peerConnection.current.setRemoteDescription(data.offer)
      const answer = await peerConnection.current.createAnswer()
      await peerConnection.current.setLocalDescription(answer)
      
      socket.emit('webrtc-answer', {
        roomId,
        answer
      })
    })

    socket.on('webrtc-answer', async (data: any) => {
      if (!peerConnection.current) return
      await peerConnection.current.setRemoteDescription(data.answer)
    })

    socket.on('ice-candidate', async (data: any) => {
      if (!peerConnection.current) return
      await peerConnection.current.addIceCandidate(data.candidate)
    })

    initWebRTC()

    return () => {
      // 清理连接
      if (dataChannel.current) {
        dataChannel.current.close()
        dataChannel.current = null
      }
      if (peerConnection.current) {
        peerConnection.current.close()
        peerConnection.current = null
      }
    }
  }, [socket, roomId, isHost])

  const sendMove = (data: any) => {
    if (dataChannel.current && dataChannel.current.readyState === 'open') {
      dataChannel.current.send(JSON.stringify(data))
      return true
    }
    return false
  }

  return {
    peerConnection: peerConnection.current,
    connectionState,
    sendMove
  }
}