import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
// import { useGomokuStore } from '../store/gameStore'  // 移除未使用的导入
import clsx from 'clsx'

interface QuickChatProps {
  onSendMessage: (message: string) => void
  className?: string
}

const QuickChat = ({ onSendMessage, className = '' }: QuickChatProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<'emoji' | 'phrase'>('emoji')
  // 移除未使用的gameState
  // const { gameState } = useGomokuStore()
  
  // 表情列表
  const emojis = [
    '😊', '😎', '🤔', '😅', '😂', '😭',
    '👍', '👎', '👏', '🙏', '💪', '✌️',
    '🎉', '🎯', '💯', '🔥', '⚡', '🌟',
    '😤', '😮', '😲', '🤯', '😱', '🙈'
  ]
  
  // 快捷短语列表
  const phrases = [
    '你好呀！一起来玩吧～',
    '承让承让，侥幸而已！',
    '哇，这步棋真是绝了！',
    '厉害厉害，我要认真了！',
    '再来一局，刚才手滑了～',
    '让你见识见识什么叫高手！',
    '我等到花儿都谢了...',
    '快点啊，我等到天都黑了',
    '容我想想，这步很关键',
    '这一步妙啊，学到了！',
    '你是高手，我甘拜下风',
    '加油加油，你可以的！',
    '哎呀，失误了失误了',
    '看我的绝杀！',
    '友谊第一，比赛第二～',
    'GG，精彩的对局！',
    '别走，决战到天亮！',
    '你这是在针对我吗？',
    '稳住，我们能赢！',
    '今天手感不太好啊...'
  ]
  
  const handleSend = (content: string) => {
    onSendMessage(content)
    setIsOpen(false)
  }
  
  // 移除游戏状态限制，让聊天按钮始终显示
  // if (gameState === 'waiting') return null
  
  return (
    <div className="relative inline-flex items-center">
      {/* 快捷聊天按钮 */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className={clsx(
          "pixel-btn bg-purple-600 hover:bg-purple-700 text-white",
          className || "px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm"
        )}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <span className="hidden sm:inline">💬 聊天</span>
        <span className="sm:hidden">聊天</span>
      </motion.button>
      
      {/* 快捷聊天面板 */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* 背景遮罩 */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/30 z-40 sm:hidden"
              onClick={() => setIsOpen(false)}
            />
            
            {/* 聊天面板 - 移动端使用固定定位确保不被遮挡 */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ type: 'spring', damping: 25, stiffness: 400 }}
              className={clsx(
                "z-50",
                // PC端定位
                "sm:absolute sm:bottom-full sm:mb-2 sm:left-1/2 sm:transform sm:-translate-x-1/2 sm:w-80",
                // 移动端固定在屏幕中央
                "fixed inset-x-4 top-1/2 -translate-y-1/2 sm:inset-auto sm:translate-y-0",
                "pixel-container bg-gray-900 p-3 sm:p-4",
                "max-h-[300px] max-w-sm mx-auto"
              )}
            >
              {/* 标签切换 */}
              <div className="flex gap-2 mb-3">
                <button
                  onClick={() => setSelectedCategory('emoji')}
                  className={clsx(
                    "flex-1 px-3 py-1 rounded text-sm font-pixel transition-all",
                    selectedCategory === 'emoji'
                      ? "bg-purple-600 text-white"
                      : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                  )}
                >
                  表情
                </button>
                <button
                  onClick={() => setSelectedCategory('phrase')}
                  className={clsx(
                    "flex-1 px-3 py-1 rounded text-sm font-pixel transition-all",
                    selectedCategory === 'phrase'
                      ? "bg-purple-600 text-white"
                      : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                  )}
                >
                  短语
                </button>
              </div>
              
              {/* 内容区 */}
              <div className="max-h-48 overflow-y-auto custom-scrollbar">
                {selectedCategory === 'emoji' ? (
                  <div className="grid grid-cols-6 gap-2">
                    {emojis.map((emoji, index) => (
                      <motion.button
                        key={index}
                        onClick={() => handleSend(emoji)}
                        className="text-2xl p-2 hover:bg-gray-700 rounded transition-colors"
                        whileHover={{ scale: 1.2 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        {emoji}
                      </motion.button>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-1">
                    {phrases.map((phrase, index) => (
                      <motion.button
                        key={index}
                        onClick={() => handleSend(phrase)}
                        className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 rounded transition-colors"
                        whileHover={{ x: 5 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        {phrase}
                      </motion.button>
                    ))}
                  </div>
                )}
              </div>
              
              {/* 小三角 - 仅PC端显示 */}
              <div className="hidden sm:block absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-0 h-0 
                border-l-8 border-l-transparent 
                border-r-8 border-r-transparent 
                border-t-8 border-t-gray-900">
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

export default QuickChat