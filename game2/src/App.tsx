import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import HomePage from '@pages/HomePage'
import GomokuGame from '@games/gomoku/GomokuGame'
import Layout from '@components/Layout'

function App() {
  return (
    <Router>
      <AnimatePresence mode="wait">
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="games/gomoku" element={<GomokuGame />} />
          </Route>
        </Routes>
      </AnimatePresence>
    </Router>
  )
}

export default App