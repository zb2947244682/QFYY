import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import PlayerAvatar from './PlayerAvatar'
import { useGomokuStore } from '../store/gameStore'

interface ChatMessage {
  id: string
  content: string
  isOpponent: boolean
  timestamp: number
  senderColor?: 1 | 2
}

interface ChatBubbleProps {
  messages: ChatMessage[]
}

const ChatBubble = ({ messages }: ChatBubbleProps) => {
  const [visibleMessages, setVisibleMessages] = useState<ChatMessage[]>([])
  const { myColor } = useGomokuStore()
  
  useEffect(() => {
    // 添加新消息时自动移除旧消息
    if (messages.length > 0) {
      const latestMessage = messages[messages.length - 1]
      setVisibleMessages(prev => [...prev, latestMessage])
      
      // 3秒后自动移除消息
      setTimeout(() => {
        setVisibleMessages(prev => prev.filter(msg => msg.id !== latestMessage.id))
      }, 3000)
    }
  }, [messages])
  
  return (
    <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none z-30">
      <AnimatePresence>
        {visibleMessages.map((message, index) => {
          const senderColor = message.isOpponent 
            ? (myColor === 1 ? 2 : 1) 
            : myColor
          
          return (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, scale: 0, y: 20 }}
              animate={{ 
                opacity: 1, 
                scale: 1, 
                y: -index * 70,
                x: message.isOpponent ? -120 : 120
              }}
              exit={{ opacity: 0, scale: 0 }}
              transition={{ type: 'spring', damping: 20, stiffness: 300 }}
              className="absolute flex items-center gap-2"
              style={{ 
                bottom: '50%',
                [message.isOpponent ? 'right' : 'left']: '50%'
              }}
            >
              {/* 头像 */}
              {message.isOpponent && (
                <PlayerAvatar 
                  color={senderColor} 
                  size="small"
                  className="pointer-events-auto"
                />
              )}
              
              {/* 消息气泡 */}
              <div className="relative">
                <div 
                  className={`
                    px-4 py-2 rounded-2xl shadow-lg pointer-events-auto
                    ${message.isOpponent 
                      ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white' 
                      : 'bg-gradient-to-r from-green-500 to-green-600 text-white'
                    }
                  `}
                >
                  {/* 如果是表情，显示大一点 */}
                  {message.content.match(/^[\u{1F300}-\u{1FAD6}]$/u) ? (
                    <span className="text-3xl">{message.content}</span>
                  ) : (
                    <span className="text-sm font-medium">{message.content}</span>
                  )}
                </div>
                
                {/* 小尾巴 */}
                <div 
                  className={`
                    absolute w-0 h-0 
                    ${message.isOpponent 
                      ? 'left-0 -ml-2 border-t-8 border-t-transparent border-b-8 border-b-transparent border-r-8 border-r-blue-500' 
                      : 'right-0 -mr-2 border-t-8 border-t-transparent border-b-8 border-b-transparent border-l-8 border-l-green-500'
                    }
                  `}
                  style={{ 
                    top: '50%',
                    transform: 'translateY(-50%)'
                  }}
                />
              </div>
              
              {/* 头像 */}
              {!message.isOpponent && (
                <PlayerAvatar 
                  color={senderColor} 
                  size="small"
                  className="pointer-events-auto"
                />
              )}
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}

export default ChatBubble