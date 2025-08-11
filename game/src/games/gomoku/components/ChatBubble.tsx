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
  const { myColor, gameState } = useGomokuStore()
  
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
  
  // 游戏未开始不显示
  if (gameState === 'waiting') return null
  
  return (
    <>
      {/* 固定位置的头像 - 作为消息起点 */}
      <div className="fixed top-[140px] sm:top-[160px] left-4 sm:left-8 z-20 pointer-events-none">
        <PlayerAvatar 
          color={myColor} 
          size="small"
          className="opacity-0"
        />
      </div>
      <div className="fixed top-[140px] sm:top-[160px] right-4 sm:right-8 z-20 pointer-events-none">
        <PlayerAvatar 
          color={myColor === 1 ? 2 : myColor === 2 ? 1 : null} 
          size="small"
          className="opacity-0"
        />
      </div>
      
      {/* 消息显示区域 */}
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none z-30">
        <AnimatePresence>
          {visibleMessages.map((message, index) => {
            const senderColor = message.isOpponent 
              ? (myColor === 1 ? 2 : 1) 
              : myColor
            
            // 计算起始位置（从头像位置开始）
            const startX = message.isOpponent ? -300 : 300
            const startY = -200
            
            return (
              <motion.div
                key={message.id}
                initial={{ 
                  opacity: 0, 
                  scale: 0.3,
                  x: startX,
                  y: startY
                }}
                animate={{ 
                  opacity: 1, 
                  scale: 1, 
                  y: -index * 70,
                  x: message.isOpponent ? -120 : 120
                }}
                exit={{ 
                  opacity: 0, 
                  scale: 0,
                  y: -index * 70 - 50
                }}
                transition={{ 
                  type: 'spring', 
                  damping: 20, 
                  stiffness: 300,
                  duration: 0.5
                }}
                className="absolute flex items-center gap-2"
                style={{ 
                  bottom: '50%',
                  [message.isOpponent ? 'right' : 'left']: '50%'
                }}
              >
                {/* 头像 */}
                {message.isOpponent && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    <PlayerAvatar 
                      color={senderColor} 
                      size="small"
                      className="pointer-events-auto"
                    />
                  </motion.div>
                )}
                
                {/* 消息气泡 */}
                <motion.div 
                  className="relative"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.1 }}
                >
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
                </motion.div>
                
                {/* 头像 */}
                {!message.isOpponent && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    <PlayerAvatar 
                      color={senderColor} 
                      size="small"
                      className="pointer-events-auto"
                    />
                  </motion.div>
                )}
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </>
  )
}

export default ChatBubble