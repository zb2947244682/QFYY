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
      {/* 消息显示区域 - 统一在棋盘左侧显示 */}
      <AnimatePresence>
        {visibleMessages.map((message, index) => {
          const senderColor = message.isOpponent 
            ? (myColor === 1 ? 2 : 1) 
            : myColor
          
          const isOpponent = message.isOpponent
          
          return (
            <motion.div
              key={message.id}
              initial={{ 
                opacity: 0, 
                scale: 0.3,
                x: -50,
                y: 0
              }}
              animate={{ 
                opacity: 1, 
                scale: 1,
                x: 0,
                y: -index * 80
              }}
              exit={{ 
                opacity: 0, 
                scale: 0,
                y: -index * 80 - 50
              }}
              transition={{ 
                type: 'spring', 
                damping: 20, 
                stiffness: 300,
                duration: 0.5
              }}
              className="fixed"
              style={{ 
                // 固定在屏幕左侧中间位置
                top: '50%',
                left: '20px',
                transform: 'translateY(-50%)',
                zIndex: 40 + index
              }}
            >
              <div className="flex items-center gap-2">
                {/* 头像始终在左侧 */}
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
                
                {/* 消息气泡在头像右侧 */}
                <motion.div 
                  className="relative"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.1 }}
                >
                  <div 
                    className={`
                      px-4 py-2 rounded-2xl shadow-lg pointer-events-auto
                      max-w-[200px] sm:max-w-[250px] break-words
                      ${isOpponent 
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
                  
                  {/* 小尾巴指向左侧头像 */}
                  <div 
                    className={`
                      absolute w-0 h-0 
                      left-0 -ml-2 
                      border-t-8 border-t-transparent 
                      border-b-8 border-b-transparent 
                      border-r-8 
                      ${isOpponent 
                        ? 'border-r-blue-500' 
                        : 'border-r-green-500'
                      }
                    `}
                    style={{ 
                      top: '50%',
                      transform: 'translateY(-50%)'
                    }}
                  />
                </motion.div>
              </div>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </>
  )
}

export default ChatBubble