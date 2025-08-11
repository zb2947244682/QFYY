import { motion, AnimatePresence } from 'framer-motion'
import { useGomokuStore } from '../store/gameStore'
import confetti from 'canvas-confetti'
import { useEffect } from 'react'

interface GameOverModalProps {
  isOpen: boolean
  onRestart: () => void
  onClose: () => void
}

const GameOverModal = ({ isOpen, onRestart, onClose }: GameOverModalProps) => {
  const { winner, myColor, score } = useGomokuStore()
  
  const isWinner = winner === myColor
  const winnerText = winner === 1 ? '黑棋' : '白棋'
  
  // 胜利时放烟花
  useEffect(() => {
    if (isOpen && isWinner) {
      // 左边烟花
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { x: 0.25, y: 0.5 }
      })
      
      // 右边烟花
      setTimeout(() => {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { x: 0.75, y: 0.5 }
        })
      }, 250)
      
      // 中间烟花
      setTimeout(() => {
        confetti({
          particleCount: 150,
          spread: 100,
          origin: { x: 0.5, y: 0.5 }
        })
      }, 500)
    }
  }, [isOpen, isWinner])
  
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* 背景遮罩 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={onClose}
          />
          
          {/* 弹窗内容 */}
          <motion.div
            initial={{ opacity: 0, scale: 0.5, y: -100 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.5, y: -100 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none"
          >
            <div className="pixel-container bg-gray-900 p-6 sm:p-8 max-w-md w-full mx-4 pointer-events-auto">
              {/* 标题 */}
              <div className="text-center mb-6">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: 'spring' }}
                  className="text-6xl mb-4"
                >
                  {isWinner ? '🏆' : '😔'}
                </motion.div>
                
                <h2 className={`text-2xl sm:text-3xl font-game font-bold mb-2 ${
                  isWinner ? 'text-yellow-400' : 'text-gray-400'
                }`}>
                  {isWinner ? '恭喜获胜！' : '再接再厉！'}
                </h2>
                
                <p className="text-gray-300 text-lg">
                  {winnerText}获得胜利
                </p>
              </div>
              
              {/* 比分显示 */}
              <div className="bg-gray-800 rounded-lg p-4 mb-6">
                <div className="text-center text-gray-400 text-sm mb-2">当前比分</div>
                <div className="flex justify-center items-center gap-8">
                  <div className="text-center">
                    <div className="w-8 h-8 bg-black rounded-full mx-auto mb-1"></div>
                    <div className="text-white font-game text-xl">{score.black}</div>
                  </div>
                  <div className="text-gray-500 text-2xl">:</div>
                  <div className="text-center">
                    <div className="w-8 h-8 bg-white rounded-full mx-auto mb-1 border-2 border-gray-400"></div>
                    <div className="text-white font-game text-xl">{score.white}</div>
                  </div>
                </div>
              </div>
              
              {/* 按钮 */}
              <div className="flex gap-3">
                <button
                  onClick={onRestart}
                  className="flex-1 pixel-btn bg-green-600 hover:bg-green-700 text-white py-3"
                >
                  再来一局
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 pixel-btn bg-gray-600 hover:bg-gray-700 text-white py-3"
                >
                  查看棋盘
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

export default GameOverModal