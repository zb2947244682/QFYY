import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, RotateCcw, Trophy, Timer, Target } from 'lucide-react'

// 卡片图标
const CARD_EMOJIS = ['🎮', '🎯', '🎲', '🎨', '🎪', '🎭', '🎰', '🎸', '🏀', '⚽', '🏈', '🎾', '🎱', '🏆', '🎪', '🎨']

interface Card {
  id: number
  emoji: string
  isFlipped: boolean
  isMatched: boolean
}

type Difficulty = 'easy' | 'medium' | 'hard'

const MemoryGame = () => {
  const navigate = useNavigate()
  const [cards, setCards] = useState<Card[]>([])
  const [flippedCards, setFlippedCards] = useState<number[]>([])
  const [moves, setMoves] = useState(0)
  const [matches, setMatches] = useState(0)
  const [gameStarted, setGameStarted] = useState(false)
  const [gameCompleted, setGameCompleted] = useState(false)
  const [difficulty, setDifficulty] = useState<Difficulty>('medium')
  const [startTime, setStartTime] = useState<number>(0)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [bestScores, setBestScores] = useState<Record<Difficulty, { moves: number, time: number }>>(() => {
    const saved = localStorage.getItem('memory-best-scores')
    return saved ? JSON.parse(saved) : {
      easy: { moves: Infinity, time: Infinity },
      medium: { moves: Infinity, time: Infinity },
      hard: { moves: Infinity, time: Infinity }
    }
  })

  // 获取卡片数量
  const getCardCount = (difficulty: Difficulty): number => {
    switch (difficulty) {
      case 'easy': return 8
      case 'medium': return 12
      case 'hard': return 16
      default: return 12
    }
  }

  // 初始化卡片
  const initializeCards = useCallback(() => {
    const cardCount = getCardCount(difficulty)
    const selectedEmojis = CARD_EMOJIS.slice(0, cardCount / 2)
    const gameCards: Card[] = []
    
    // 创建卡片对（每个图标两张）
    selectedEmojis.forEach((emoji, index) => {
      gameCards.push(
        { id: index * 2, emoji, isFlipped: false, isMatched: false },
        { id: index * 2 + 1, emoji, isFlipped: false, isMatched: false }
      )
    })
    
    // 打乱卡片顺序
    for (let i = gameCards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [gameCards[i], gameCards[j]] = [gameCards[j], gameCards[i]]
    }
    
    setCards(gameCards)
    setFlippedCards([])
    setMoves(0)
    setMatches(0)
    setGameCompleted(false)
    setGameStarted(false)
    setElapsedTime(0)
  }, [difficulty])

  // 处理卡片点击
  const handleCardClick = (cardId: number) => {
    // 如果游戏未开始，开始计时
    if (!gameStarted) {
      setGameStarted(true)
      setStartTime(Date.now())
    }
    
    const card = cards.find(c => c.id === cardId)
    
    // 忽略已翻开或已匹配的卡片
    if (!card || card.isFlipped || card.isMatched || flippedCards.length >= 2) {
      return
    }
    
    // 翻开卡片
    const newCards = cards.map(c => 
      c.id === cardId ? { ...c, isFlipped: true } : c
    )
    setCards(newCards)
    
    const newFlippedCards = [...flippedCards, cardId]
    setFlippedCards(newFlippedCards)
    
    // 如果翻开了两张卡片，检查是否匹配
    if (newFlippedCards.length === 2) {
      setMoves(moves + 1)
      checkForMatch(newFlippedCards)
    }
  }

  // 检查匹配
  const checkForMatch = (flippedIds: number[]) => {
    const [firstId, secondId] = flippedIds
    const firstCard = cards.find(c => c.id === firstId)
    const secondCard = cards.find(c => c.id === secondId)
    
    if (firstCard && secondCard && firstCard.emoji === secondCard.emoji) {
      // 匹配成功
      setTimeout(() => {
        setCards(prevCards => 
          prevCards.map(c => 
            c.id === firstId || c.id === secondId 
              ? { ...c, isMatched: true } 
              : c
          )
        )
        setMatches(matches + 1)
        setFlippedCards([])
        
        // 检查游戏是否完成
        const cardCount = getCardCount(difficulty)
        if (matches + 1 === cardCount / 2) {
          handleGameComplete()
        }
      }, 500)
    } else {
      // 匹配失败，翻回卡片
      setTimeout(() => {
        setCards(prevCards => 
          prevCards.map(c => 
            c.id === firstId || c.id === secondId 
              ? { ...c, isFlipped: false } 
              : c
          )
        )
        setFlippedCards([])
      }, 1000)
    }
  }

  // 游戏完成
  const handleGameComplete = () => {
    const endTime = Date.now()
    const totalTime = Math.floor((endTime - startTime) / 1000)
    setElapsedTime(totalTime)
    setGameCompleted(true)
    
    // 检查是否创造新记录
    const currentBest = bestScores[difficulty]
    if (moves < currentBest.moves || totalTime < currentBest.time) {
      const newBestScores = {
        ...bestScores,
        [difficulty]: {
          moves: Math.min(moves, currentBest.moves),
          time: Math.min(totalTime, currentBest.time)
        }
      }
      setBestScores(newBestScores)
      localStorage.setItem('memory-best-scores', JSON.stringify(newBestScores))
    }
  }

  // 重新开始游戏
  const resetGame = () => {
    initializeCards()
  }

  // 更改难度
  const changeDifficulty = (newDifficulty: Difficulty) => {
    setDifficulty(newDifficulty)
    setGameStarted(false)
    setGameCompleted(false)
  }

  // 计时器
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>
    
    if (gameStarted && !gameCompleted) {
      interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTime) / 1000))
      }, 1000)
    }
    
    return () => clearInterval(interval)
  }, [gameStarted, gameCompleted, startTime])

  // 初始化游戏
  useEffect(() => {
    initializeCards()
  }, [initializeCards])

  // 格式化时间
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // 获取网格样式
  const getGridCols = () => {
    switch (difficulty) {
      case 'easy': return 'grid-cols-4'
      case 'medium': return 'grid-cols-4'
      case 'hard': return 'grid-cols-4'
      default: return 'grid-cols-4'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex flex-col items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-4xl"
      >
        {/* 游戏头部 */}
        <div className="bg-gray-800/50 backdrop-blur rounded-t-xl p-4 border-t border-l border-r border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft size={20} />
              <span className="font-game">返回</span>
            </button>
            <h1 className="text-2xl font-game font-bold text-white">记忆翻牌</h1>
            <button
              onClick={resetGame}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
            >
              <RotateCcw size={16} />
              <span className="font-game">重新开始</span>
            </button>
          </div>

          {/* 难度选择 */}
          <div className="flex justify-center gap-2 mb-4">
            {(['easy', 'medium', 'hard'] as Difficulty[]).map(level => (
              <button
                key={level}
                onClick={() => changeDifficulty(level)}
                className={`px-4 py-2 rounded-lg font-game transition-all ${
                  difficulty === level
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-700 text-gray-400 hover:bg-gray-600 hover:text-white'
                }`}
              >
                {level === 'easy' ? '简单' : level === 'medium' ? '中等' : '困难'}
              </button>
            ))}
          </div>

          {/* 游戏信息 */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-gray-700/50 rounded-lg p-3 text-center">
              <div className="text-gray-400 text-sm font-game flex items-center justify-center gap-1">
                <Target size={14} />
                步数
              </div>
              <div className="text-2xl font-bold text-white font-game">{moves}</div>
            </div>
            <div className="bg-gray-700/50 rounded-lg p-3 text-center">
              <div className="text-gray-400 text-sm font-game flex items-center justify-center gap-1">
                <Timer size={14} />
                时间
              </div>
              <div className="text-2xl font-bold text-white font-game">{formatTime(elapsedTime)}</div>
            </div>
            <div className="bg-gray-700/50 rounded-lg p-3 text-center">
              <div className="text-gray-400 text-sm font-game">匹配</div>
              <div className="text-2xl font-bold text-green-400 font-game">
                {matches}/{getCardCount(difficulty) / 2}
              </div>
            </div>
          </div>

          {/* 最佳记录 */}
          {bestScores[difficulty].moves !== Infinity && (
            <div className="mt-4 p-3 bg-gray-700/30 rounded-lg flex justify-center gap-6">
              <div className="text-center">
                <div className="text-gray-400 text-xs font-game">最少步数</div>
                <div className="text-yellow-400 font-game font-bold">{bestScores[difficulty].moves}</div>
              </div>
              <div className="text-center">
                <div className="text-gray-400 text-xs font-game flex items-center gap-1">
                  <Trophy size={12} />
                  最快时间
                </div>
                <div className="text-yellow-400 font-game font-bold">{formatTime(bestScores[difficulty].time)}</div>
              </div>
            </div>
          )}
        </div>

        {/* 游戏区域 */}
        <div className="bg-gray-900 border border-gray-700 p-6 rounded-b-xl">
          <div className={`grid ${getGridCols()} gap-3 max-w-2xl mx-auto`}>
            {cards.map(card => (
              <motion.div
                key={card.id}
                whileHover={{ scale: card.isFlipped || card.isMatched ? 1 : 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="aspect-square"
              >
                <button
                  onClick={() => handleCardClick(card.id)}
                  disabled={card.isFlipped || card.isMatched}
                  className="w-full h-full relative preserve-3d"
                  style={{
                    transformStyle: 'preserve-3d',
                    transform: card.isFlipped || card.isMatched ? 'rotateY(180deg)' : 'rotateY(0deg)',
                    transition: 'transform 0.6s'
                  }}
                >
                  {/* 卡片背面 */}
                  <div 
                    className="absolute inset-0 bg-gradient-to-br from-purple-600 to-purple-800 rounded-lg border-2 border-purple-500 flex items-center justify-center backface-hidden"
                    style={{ backfaceVisibility: 'hidden' }}
                  >
                    <span className="text-3xl sm:text-4xl">❓</span>
                  </div>
                  
                  {/* 卡片正面 */}
                  <div 
                    className={`absolute inset-0 ${
                      card.isMatched 
                        ? 'bg-gradient-to-br from-green-600 to-green-800 border-green-500' 
                        : 'bg-gradient-to-br from-blue-600 to-blue-800 border-blue-500'
                    } rounded-lg border-2 flex items-center justify-center`}
                    style={{ 
                      backfaceVisibility: 'hidden',
                      transform: 'rotateY(180deg)'
                    }}
                  >
                    <motion.span 
                      className="text-4xl sm:text-5xl"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.2 }}
                    >
                      {card.emoji}
                    </motion.span>
                  </div>
                </button>
              </motion.div>
            ))}
          </div>

          {/* 游戏完成提示 */}
          <AnimatePresence>
            {gameCompleted && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50"
              >
                <motion.div
                  initial={{ y: 50 }}
                  animate={{ y: 0 }}
                  className="bg-gray-800 p-8 rounded-xl border border-gray-700 text-center max-w-md"
                >
                  <h2 className="text-3xl font-game font-bold text-green-400 mb-4">🎉 完成!</h2>
                  <div className="space-y-2 mb-6">
                    <p className="text-white font-game">
                      用时: <span className="text-yellow-400">{formatTime(elapsedTime)}</span>
                    </p>
                    <p className="text-white font-game">
                      步数: <span className="text-yellow-400">{moves}</span>
                    </p>
                    {moves <= bestScores[difficulty].moves && (
                      <p className="text-green-400 font-game">🏆 新记录!</p>
                    )}
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={resetGame}
                      className="flex-1 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-game rounded-lg transition-colors"
                    >
                      再玩一次
                    </button>
                    <button
                      onClick={() => navigate('/')}
                      className="flex-1 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-game rounded-lg transition-colors"
                    >
                      返回主页
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  )
}

export default MemoryGame