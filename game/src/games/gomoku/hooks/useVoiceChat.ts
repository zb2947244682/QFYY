import { useEffect, useRef, useState, useCallback } from 'react'
import { useSocket } from './useSocket'
import { useGomokuStore } from '../store/gameStore'

interface PeerConnection {
  peerId: string
  connection: RTCPeerConnection
  stream?: MediaStream
  audioElement?: HTMLAudioElement
}

export const useVoiceChat = () => {
  const [isMicEnabled, setIsMicEnabled] = useState(false)
  const [isSpeakerEnabled, setIsSpeakerEnabled] = useState(true)
  const [isSupported, setIsSupported] = useState(true)
  const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'prompt'>('prompt')
  const [errorMessage, setErrorMessage] = useState<string>('')
  
  const localStream = useRef<MediaStream | null>(null)
  const peerConnections = useRef<Map<string, PeerConnection>>(new Map())
  const audioContainer = useRef<HTMLDivElement | null>(null)
  
  const { socket } = useSocket()
  const { roomId } = useGomokuStore()

  // 检查浏览器是否支持getUserMedia
  useEffect(() => {
    const checkSupport = () => {
      const isLocalhost = window.location.hostname === 'localhost' || 
                         window.location.hostname === '127.0.0.1' ||
                         window.location.hostname === '[::1]'
      
      const isSecure = window.location.protocol === 'https:' || isLocalhost
      
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setIsSupported(false)
        setErrorMessage('浏览器不支持音频功能')
        return false
      }
      
      if (!isSecure) {
        setErrorMessage('⚠️ 由于安全限制，语音功能仅在HTTPS或本地环境可用。请使用localhost访问或部署HTTPS证书。')
        setIsSupported(false)
        return false
      }
      
      return true
    }
    
    checkSupport()
  }, [])

  // 检查麦克风权限
  const checkPermission = useCallback(async () => {
    if (!isSupported) return 'denied'
    
    try {
      // 尝试查询权限状态
      if (navigator.permissions && navigator.permissions.query) {
        const result = await navigator.permissions.query({ name: 'microphone' as PermissionName })
        setPermissionStatus(result.state as 'granted' | 'denied' | 'prompt')
        
        result.addEventListener('change', () => {
          setPermissionStatus(result.state as 'granted' | 'denied' | 'prompt')
        })
        
        return result.state
      }
    } catch (error) {
      console.warn('无法查询麦克风权限:', error)
    }
    
    return 'prompt'
  }, [isSupported])

  // 初始化音频容器
  useEffect(() => {
    if (!audioContainer.current) {
      const container = document.createElement('div')
      container.id = 'voice-chat-audio-container'
      container.style.display = 'none'
      document.body.appendChild(container)
      audioContainer.current = container
    }
    
    return () => {
      if (audioContainer.current) {
        audioContainer.current.remove()
        audioContainer.current = null
      }
    }
  }, [])

  // 创建RTCPeerConnection
  const createPeerConnection = useCallback((peerId: string): RTCPeerConnection => {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    })
    
    // 添加本地流
    if (localStream.current) {
      localStream.current.getTracks().forEach(track => {
        if (localStream.current) {
          pc.addTrack(track, localStream.current)
        }
      })
    }
    
    // 处理远程流
    pc.ontrack = (event) => {
      console.log('收到远程音频流:', peerId)
      const [remoteStream] = event.streams
      
      // 创建音频元素播放远程流
      const audio = document.createElement('audio')
      audio.srcObject = remoteStream
      audio.autoplay = true
      audio.muted = !isSpeakerEnabled
      
      if (audioContainer.current) {
        audioContainer.current.appendChild(audio)
      }
      
      // 更新peer连接信息
      const peerInfo = peerConnections.current.get(peerId)
      if (peerInfo) {
        peerInfo.stream = remoteStream
        peerInfo.audioElement = audio
      }
    }
    
    // 处理ICE候选
    pc.onicecandidate = (event) => {
      if (event.candidate && socket && roomId) {
        socket.emit('voice-ice-candidate', {
          roomId,
          candidate: event.candidate,
          targetPeerId: peerId
        })
      }
    }
    
    // 监听连接状态
    pc.onconnectionstatechange = () => {
      console.log(`连接状态 [${peerId}]:`, pc.connectionState)
      
      if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        // 清理断开的连接
        closePeerConnection(peerId)
      }
    }
    
    return pc
  }, [socket, roomId, isSpeakerEnabled])

  // 关闭对等连接
  const closePeerConnection = useCallback((peerId: string) => {
    const peerInfo = peerConnections.current.get(peerId)
    if (peerInfo) {
      // 移除音频元素
      if (peerInfo.audioElement && audioContainer.current) {
        audioContainer.current.removeChild(peerInfo.audioElement)
      }
      
      // 关闭连接
      peerInfo.connection.close()
      
      // 从Map中删除
      peerConnections.current.delete(peerId)
    }
  }, [])

  // 开启麦克风
  const enableMic = useCallback(async () => {
    if (!isSupported) {
      setErrorMessage('当前环境不支持语音功能')
      return false
    }
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      })
      
      localStream.current = stream
      setIsMicEnabled(true)
      setPermissionStatus('granted')
      
      // 自动开启喇叭
      setIsSpeakerEnabled(true)
      
      // 通知服务器加入语音频道
      if (socket && roomId) {
        socket.emit('join-voice-channel', { roomId })
      }
      
      return true
    } catch (error: any) {
      console.error('无法获取麦克风权限:', error)
      
      if (error.name === 'NotAllowedError') {
        setPermissionStatus('denied')
        setErrorMessage('麦克风权限被拒绝，请在浏览器设置中允许麦克风访问')
      } else if (error.name === 'NotFoundError') {
        setErrorMessage('未找到麦克风设备')
      } else if (error.name === 'NotReadableError') {
        setErrorMessage('麦克风被其他应用占用')
      } else {
        setErrorMessage('无法访问麦克风: ' + error.message)
      }
      
      return false
    }
  }, [isSupported, socket, roomId])

  // 关闭麦克风
  const disableMic = useCallback(() => {
    if (localStream.current) {
      localStream.current.getTracks().forEach(track => track.stop())
      localStream.current = null
    }
    
    setIsMicEnabled(false)
    
    // 通知服务器离开语音频道
    if (socket && roomId) {
      socket.emit('leave-voice-channel', { roomId })
    }
    
    // 关闭所有对等连接
    peerConnections.current.forEach((_, peerId) => {
      closePeerConnection(peerId)
    })
  }, [socket, roomId, closePeerConnection])

  // 切换麦克风状态
  const toggleMic = useCallback(async () => {
    if (isMicEnabled) {
      disableMic()
    } else {
      await enableMic()
    }
  }, [isMicEnabled, enableMic, disableMic])

  // 切换喇叭状态
  const toggleSpeaker = useCallback(() => {
    const newState = !isSpeakerEnabled
    setIsSpeakerEnabled(newState)
    
    // 更新所有音频元素的静音状态
    peerConnections.current.forEach(peerInfo => {
      if (peerInfo.audioElement) {
        peerInfo.audioElement.muted = !newState
      }
    })
  }, [isSpeakerEnabled])

  // 监听WebRTC信令事件
  useEffect(() => {
    if (!socket || !roomId) return
    
    // 有新用户加入语音频道
    const handleUserJoinedVoice = async (data: { userId: string }) => {
      console.log('用户加入语音频道:', data.userId)
      
      // 如果本地有音频流，创建offer
      if (localStream.current) {
        const pc = createPeerConnection(data.userId)
        peerConnections.current.set(data.userId, {
          peerId: data.userId,
          connection: pc
        })
        
        const offer = await pc.createOffer()
        await pc.setLocalDescription(offer)
        
        socket.emit('voice-offer', {
          roomId,
          offer,
          targetPeerId: data.userId
        })
      }
    }
    
    // 收到offer
    const handleVoiceOffer = async (data: { offer: RTCSessionDescriptionInit, fromPeerId: string }) => {
      console.log('收到语音offer:', data.fromPeerId)
      
      const pc = createPeerConnection(data.fromPeerId)
      peerConnections.current.set(data.fromPeerId, {
        peerId: data.fromPeerId,
        connection: pc
      })
      
      await pc.setRemoteDescription(data.offer)
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)
      
      socket.emit('voice-answer', {
        roomId,
        answer,
        targetPeerId: data.fromPeerId
      })
    }
    
    // 收到answer
    const handleVoiceAnswer = async (data: { answer: RTCSessionDescriptionInit, fromPeerId: string }) => {
      console.log('收到语音answer:', data.fromPeerId)
      
      const peerInfo = peerConnections.current.get(data.fromPeerId)
      if (peerInfo) {
        await peerInfo.connection.setRemoteDescription(data.answer)
      }
    }
    
    // 收到ICE候选
    const handleVoiceIceCandidate = async (data: { candidate: RTCIceCandidateInit, fromPeerId: string }) => {
      const peerInfo = peerConnections.current.get(data.fromPeerId)
      if (peerInfo) {
        await peerInfo.connection.addIceCandidate(data.candidate)
      }
    }
    
    // 用户离开语音频道
    const handleUserLeftVoice = (data: { userId: string }) => {
      console.log('用户离开语音频道:', data.userId)
      closePeerConnection(data.userId)
    }
    
    socket.on('user-joined-voice', handleUserJoinedVoice)
    socket.on('voice-offer', handleVoiceOffer)
    socket.on('voice-answer', handleVoiceAnswer)
    socket.on('voice-ice-candidate', handleVoiceIceCandidate)
    socket.on('user-left-voice', handleUserLeftVoice)
    
    return () => {
      socket.off('user-joined-voice', handleUserJoinedVoice)
      socket.off('voice-offer', handleVoiceOffer)
      socket.off('voice-answer', handleVoiceAnswer)
      socket.off('voice-ice-candidate', handleVoiceIceCandidate)
      socket.off('user-left-voice', handleUserLeftVoice)
    }
  }, [socket, roomId, createPeerConnection, closePeerConnection])

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      disableMic()
    }
  }, [disableMic])

  return {
    isMicEnabled,
    isSpeakerEnabled,
    isSupported,
    permissionStatus,
    errorMessage,
    toggleMic,
    toggleSpeaker,
    checkPermission
  }
}