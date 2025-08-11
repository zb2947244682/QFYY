import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGomokuStore } from '../store/gameStore'
import clsx from 'clsx'

interface QuickChatProps {
  onSendMessage: (message: string) => void
}

const QuickChat = ({ onSendMessage }: QuickChatProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<'emoji' | 'phrase'>('emoji')
  const { gameState } = useGomokuStore()
  
  // 表情列表
  const emojis = [
    '😊', '😎', '🤔', '😅', '😂', '😭',
    '👍', '👎', '👏', '🙏', '💪', '✌️',
    '🎉', '🎯', '💯', '🔥', '⚡', '🌟',
    '😤', '😮', '😲', '🤯', '😱', '🙈'
  ]
  
  // 快捷短语列表
  const phrases = [
    '你好！',
    '承让了！',
    '精彩！',
    '厉害！',
    '再来一局？',
    '我要认真了！',
    '运气不错',
    '失误了',
    '让我想想',
    '这步棋妙',
    '你真厉害',
    '加油！',
    '我输了',
    '我赢了',
    '谢谢对局',
    'GG'
  ]
  
  const handleSend = (content: string) => {
    onSendMessage(content)
    setIsOpen(false)
  }
  
  // 游戏未在进行时不显示
  if (gameState === 'waiting') return null
  
  return (
    <div className="relative">
      {/* 快捷聊天按钮 */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className={clsx(
          "pixel-btn bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 text-xs sm:text-sm",
          "fixed bottom-4 left-4 z-40 shadow-lg"
        )}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        <span className="hidden sm:inline">💬 快捷聊天</span>
        <span className="sm:hidden">💬</span>
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
            
            {/* 聊天面板 */}
            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              transition={{ type: 'spring', damping: 25, stiffness: 400 }}
              className={clsx(
                "fixed bottom-16 left-4 right-4 sm:left-4 sm:right-auto z-50",
                "pixel-container bg-gray-900 p-3 sm:p-4",
                "max-w-sm sm:w-80"
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
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

export default QuickChat