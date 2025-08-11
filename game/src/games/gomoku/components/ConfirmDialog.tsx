import { motion, AnimatePresence } from 'framer-motion'

interface ConfirmDialogProps {
  isOpen: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  onConfirm: () => void
  onCancel: () => void
}

const ConfirmDialog = ({
  isOpen,
  title,
  message,
  confirmText = '同意',
  cancelText = '拒绝',
  onConfirm,
  onCancel
}: ConfirmDialogProps) => {
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
            onClick={onCancel}
          />
          
          {/* 对话框内容 */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ type: 'spring', damping: 25, stiffness: 400 }}
            className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none px-4"
          >
            <div className="pixel-container bg-gray-900 p-4 sm:p-6 max-w-sm w-full pointer-events-auto">
              {/* 标题 */}
              <h3 className="text-lg sm:text-xl font-game font-bold text-yellow-400 mb-3">
                {title}
              </h3>
              
              {/* 消息 */}
              <p className="text-gray-300 mb-6 text-sm sm:text-base">
                {message}
              </p>
              
              {/* 按钮 */}
              <div className="flex gap-3">
                <button
                  onClick={onConfirm}
                  className="flex-1 pixel-btn bg-green-600 hover:bg-green-700 text-white py-2 text-sm sm:text-base"
                >
                  {confirmText}
                </button>
                <button
                  onClick={onCancel}
                  className="flex-1 pixel-btn bg-red-600 hover:bg-red-700 text-white py-2 text-sm sm:text-base"
                >
                  {cancelText}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

export default ConfirmDialog