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
      {/* 消息显示区域 - 在头像附近显示 */}
      <AnimatePresence>
        {visibleMessages.map((message, index) => {
          const senderColor = message.isOpponent 
            ? (myColor === 1 ? 2 : 1) 
            : myColor
          
          // PC端和移动端使用不同的定位
          const isMobile = window.innerWidth < 640
          
          // 根据是否是对手，确定消息的起始和结束位置
          const isOpponent = message.isOpponent
          
          return (
            <motion.div
              key={message.id}
              initial={{ 
                opacity: 0, 
                scale: 0.3,
                // 从头像位置开始
                ...(isMobile ? {
                  // 移动端：从屏幕上方的头像位置弹出
                  x: isOpponent ? window.innerWidth * 0.3 : -window.innerWidth * 0.3,
                  y: -window.innerHeight * 0.35
                } : {
                  // PC端：从屏幕侧边的头像位置弹出
                  x: isOpponent ? window.innerWidth * 0.4 : -window.innerWidth * 0.4,
                  y: -100
                })
              }}
              animate={{ 
                opacity: 1, 
                scale: 1,
                // 移动到屏幕中央附近
                x: isOpponent ? 60 : -60,
                y: -index * 80 - 50
              }}
              exit={{ 
                opacity: 0, 
                scale: 0,
                y: -index * 80 - 100
              }}
              transition={{ 
                type: 'spring', 
                damping: 20, 
                stiffness: 300,
                duration: 0.5
              }}
              className="fixed"
              style={{ 
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                zIndex: 40 + index
              }}
            >
              <div className="flex items-center gap-2">
                {/* 对手的头像在左侧 */}
                {isOpponent && (
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
                  
                  {/* 小尾巴 */}
                  <div 
                    className={`
                      absolute w-0 h-0 
                      ${isOpponent 
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
                
                {/* 我的头像在右侧 */}
                {!isOpponent && (
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
              </div>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </>
  )
}

export default ChatBubble