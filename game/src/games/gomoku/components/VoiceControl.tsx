import { useEffect } from 'react'
import { motion } from 'framer-motion'
import clsx from 'clsx'
import { useVoiceChat } from '../hooks/useVoiceChat'
import { useGomokuStore } from '../store/gameStore'

interface VoiceControlProps {
  className?: string
}

const VoiceControl = ({ className }: VoiceControlProps) => {
  const {
    isMicEnabled,
    isSpeakerEnabled,
    isSupported,
    permissionStatus,
    errorMessage,
    toggleMic,
    toggleSpeaker,
    checkPermission
  } = useVoiceChat()
  
  const { addNotification } = useGomokuStore()

  // 检查权限状态
  useEffect(() => {
    checkPermission()
  }, [checkPermission])

  // 显示错误消息
  useEffect(() => {
    if (errorMessage) {
      addNotification('warning', errorMessage)
    }
  }, [errorMessage, addNotification])

  // 处理麦克风点击
  const handleMicClick = async () => {
    if (!isSupported) {
      addNotification('warning', '⚠️ 当前环境不支持语音功能，请使用HTTPS或localhost访问')
      return
    }
    
    if (permissionStatus === 'denied') {
      addNotification('warning', '⚠️ 麦克风权限被拒绝，请在浏览器设置中允许')
      return
    }
    
    await toggleMic()
  }

  // 处理喇叭点击
  const handleSpeakerClick = () => {
    if (!isSpeakerEnabled && !isMicEnabled) {
      addNotification('info', '💡 提示：单独开启喇叭可以听到其他人说话')
    }
    toggleSpeaker()
  }

  return (
    <div className={clsx("inline-flex gap-1", className)}>
      {/* 麦克风按钮 */}
      <motion.button
        onClick={handleMicClick}
        disabled={!isSupported}
        className={clsx(
          "pixel-btn relative transition-all",
          // 添加默认的padding和字体大小
          "px-2 py-1 sm:px-3 sm:py-2",
          "text-[10px] sm:text-sm",
          isMicEnabled ? "bg-green-600 hover:bg-green-700" : "bg-gray-600 hover:bg-gray-700",
          !isSupported && "opacity-50 cursor-not-allowed"
        )}
        whileHover={{ scale: isSupported ? 1.05 : 1 }}
        whileTap={{ scale: isSupported ? 0.95 : 1 }}
        title={
          !isSupported ? "语音功能需要HTTPS或localhost环境" :
          isMicEnabled ? "关闭麦克风" : "开启麦克风"
        }
      >
        <span className="text-base sm:text-lg">
          {isMicEnabled ? '🎤' : '🔇'} 
        </span>
        
        {/* 麦克风状态指示器 */}
        {isMicEnabled && (
          <motion.span
            className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
          />
        )}
      </motion.button>

      {/* 喇叭按钮 */}
      <motion.button
        onClick={handleSpeakerClick}
        className={clsx(
          "pixel-btn relative transition-all",
          // 添加默认的padding和字体大小
          "px-2 py-1 sm:px-3 sm:py-2",
          "text-[10px] sm:text-sm",
          isSpeakerEnabled ? "bg-blue-600 hover:bg-blue-700" : "bg-gray-600 hover:bg-gray-700"
        )}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        title={isSpeakerEnabled ? "关闭喇叭" : "开启喇叭"}
      >
        <span className="text-base sm:text-lg">
          {isSpeakerEnabled ? '🔊' : '🔈'} 
        </span>
      </motion.button>

      {/* 移除权限状态提示，改为通过通知显示 */}
    </div>
  )
}

export default VoiceControl