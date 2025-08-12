import { Outlet, Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useState, useEffect } from 'react'

/**
 * 主布局组件 - 提供响应式导航和页面结构
 * 优化了移动端显示效果和触摸交互体验
 */
const Layout = () => {
  const location = useLocation()
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const isHomePage = location.pathname === '/'

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
      {/* 背景动画粒子效果 - 在移动端减少粒子数量以提升性能 */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        {[...Array(window.innerWidth < 768 ? 20 : 50)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-white opacity-30"
            initial={{
              x: Math.random() * window.innerWidth,
              y: Math.random() * window.innerHeight,
            }}
            animate={{
              y: [null, -window.innerHeight],
            }}
            transition={{
              duration: Math.random() * 20 + 10,
              repeat: Infinity,
              ease: "linear",
              delay: Math.random() * 10,
            }}
          />
        ))}
      </div>

      {/* 头部导航 - 优化移动端布局 */}
      <header className="relative z-10">
        <nav className="container mx-auto px-3 sm:px-4 py-2 sm:py-3">
          <div className="flex justify-between items-center">
            <Link to="/" className="flex items-center space-x-2 sm:space-x-3">
              <motion.div
                whileHover={{ rotate: 360 }}
                whileTap={{ scale: 0.95 }}
                transition={{ duration: 0.5 }}
                className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center"
              >
                <span className="text-white font-bold text-lg sm:text-xl">G</span>
              </motion.div>
              <h1 className="text-base sm:text-xl font-game font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                <span className="hidden sm:inline">Game Collection</span>
                <span className="sm:hidden">游戏合集</span>
              </h1>
            </Link>

            <div className="flex items-center space-x-3 sm:space-x-6">
              {!isHomePage && (
                <motion.div
                  whileTap={{ scale: 0.95 }}
                  transition={{ duration: 0.1 }}
                >
                  <Link 
                    to="/" 
                    className="pixel-btn text-xs px-2 py-1 sm:px-3 sm:py-2 flex items-center justify-center"
                  >
                    <span className="hidden sm:inline">返回首页</span>
                    <span className="sm:hidden">首页</span>
                  </Link>
                </motion.div>
              )}
              <div className="text-xs sm:text-sm font-pixel text-gray-400 hidden sm:block">
                {time.toLocaleTimeString('zh-CN')}
              </div>
            </div>
          </div>
        </nav>
      </header>

      {/* 主内容区域 - 优化移动端间距 */}
      <main className="relative z-10 container mx-auto px-3 sm:px-4 py-1 sm:py-2">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          <Outlet />
        </motion.div>
      </main>

      {/* 页脚 - 移动端简化显示 */}
      <footer className="relative z-10">
        <div className="container mx-auto px-3 sm:px-4 py-2 sm:py-3">
          <div className="text-center text-xs sm:text-sm text-gray-500 font-pixel">
            © 2024 Game Collection
          </div>
        </div>
      </footer>
    </div>
  )
}

export default Layout