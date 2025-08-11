import { motion, AnimatePresence } from 'framer-motion'
import { useGomokuStore } from '../store/gameStore'
import confetti from 'canvas-confetti'
import { useEffect } from 'react'
import { clsx } from 'clsx'

interface GameOverModalProps {
  isOpen: boolean
  onRestart: () => void
  onClose: () => void
  waitingForOpponent?: boolean
}

const GameOverModal = ({ isOpen, onRestart, onClose, waitingForOpponent = false }: GameOverModalProps) => {
  const { winner, myColor, score } = useGomokuStore()
  const isWinner = winner === myColor
  
  // 调试日志
  console.log('GameOverModal - winner:', winner, 'myColor:', myColor, 'isWinner:', isWinner)
  
  // 如果胜利，放烟花
  useEffect(() => {
    if (isOpen && isWinner && !waitingForOpponent) {
      // 放多次烟花
      const fire = () => {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        })
      }
      
      fire()
      const timer1 = setTimeout(fire, 200)
      const timer2 = setTimeout(fire, 400)
      
      return () => {
        clearTimeout(timer1)
        clearTimeout(timer2)
      }
    }
  }, [isOpen, isWinner, waitingForOpponent])
  
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* 背景遮罩 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            onClick={!waitingForOpponent ? onClose : undefined}
          />
          
          {/* 弹窗内容 */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 400 }}
            className="fixed inset-0 flex items-center justify-center z-50 p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="pixel-container bg-gray-900 p-6 sm:p-8 max-w-md w-full">
              {waitingForOpponent ? (
                // 等待对手状态
                <div className="text-center">
                  <div className="mb-6">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-yellow-400 mx-auto"></div>
                  </div>
                  <h2 className="text-2xl font-game font-bold text-yellow-400 mb-4">
                    等待对手...
                  </h2>
                  <p className="text-gray-300 mb-6">
                    已发送再来一局请求，等待对手同意
                  </p>
                </div>
              ) : (
                // 游戏结束状态
                <>
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: 'spring' }}
                    className="text-center mb-6"
                  >
                    <div className="text-6xl mb-4">
                      {isWinner ? '🏆' : '💪'}
                    </div>
                    <h2 className={clsx(
                      "text-3xl font-game font-bold mb-2",
                      isWinner ? "text-yellow-400 animate-glow" : "text-gray-400"
                    )}>
                      {isWinner ? '恭喜胜利！' : '再接再厉！'}
                    </h2>
                    <p className="text-gray-300">
                      {isWinner ? '你赢得了这局比赛！' : '别灰心，下局再战！'}
                    </p>
                  </motion.div>
                  
                  {/* 比分显示 */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="bg-gray-800/50 rounded-lg p-4 mb-6"
                  >
                    <div className="text-center text-sm text-gray-400 mb-2">当前比分</div>
                    <div className="flex items-center justify-center gap-6">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-gray-800 to-black rounded-full shadow-lg"></div>
                        <span className="font-game text-2xl text-white">{score.black}</span>
                      </div>
                      <div className="text-gray-500 text-2xl">:</div>
                      <div className="flex items-center gap-2">
                        <span className="font-game text-2xl text-white">{score.white}</span>
                        <div className="w-8 h-8 bg-gradient-to-br from-white to-gray-200 rounded-full border-2 border-gray-400 shadow-lg"></div>
                      </div>
                    </div>
                    <div className="text-center text-sm text-gray-400 mt-2">
                      {winner === 1 ? '黑棋获胜' : winner === 2 ? '白棋获胜' : '平局'}
                    </div>
                  </motion.div>
                  
                  {/* 操作按钮 */}
                  <div className="flex gap-3">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={onRestart}
                      className="flex-1 pixel-btn bg-green-600 hover:bg-green-700 text-white py-3"
                    >
                      再来一局
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={onClose}
                      className="flex-1 pixel-btn bg-gray-600 hover:bg-gray-700 text-white py-3"
                    >
                      查看棋盘
                    </motion.button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

export default GameOverModal