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
    <div className={clsx("flex gap-1", className)}>
      {/* 麦克风按钮 */}
      <motion.button
        onClick={handleMicClick}
        disabled={!isSupported}
        className={clsx(
          "pixel-btn relative transition-all",
          isMicEnabled ? "bg-green-600 hover:bg-green-700" : "bg-gray-600 hover:bg-gray-700",
          !isSupported && "opacity-50 cursor-not-allowed"
        )}
        whileHover={{ scale: isSupported ? 1.05 : 1 }}
        whileTap={{ scale: isSupported ? 0.95 : 1 }}
        title={
          !isSupported ? "语音功能不可用" :
          isMicEnabled ? "关闭麦克风" : "开启麦克风"
        }
      >
        {isMicEnabled ? (
          <svg 
            className="w-4 h-4 sm:w-5 sm:h-5" 
            fill="currentColor" 
            viewBox="0 0 20 20"
          >
            <path 
              fillRule="evenodd" 
              d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" 
              clipRule="evenodd" 
            />
          </svg>
        ) : (
          <svg 
            className="w-4 h-4 sm:w-5 sm:h-5" 
            fill="currentColor" 
            viewBox="0 0 20 20"
          >
            <path 
              fillRule="evenodd" 
              d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" 
              clipRule="evenodd" 
            />
            <path d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4z" opacity="0.3"/>
            <path d="M11 14.93V17h3a1 1 0 110 2H6a1 1 0 110-2h3v-2.07A7.001 7.001 0 013 8a1 1 0 012 0 5 5 0 0010 0 1 1 0 112 0 7.001 7.001 0 01-6 6.93z" opacity="0.3"/>
          </svg>
        )}
        
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
          isSpeakerEnabled ? "bg-blue-600 hover:bg-blue-700" : "bg-gray-600 hover:bg-gray-700"
        )}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        title={isSpeakerEnabled ? "关闭喇叭" : "开启喇叭"}
      >
        {isSpeakerEnabled ? (
          <svg 
            className="w-4 h-4 sm:w-5 sm:h-5" 
            fill="currentColor" 
            viewBox="0 0 20 20"
          >
            <path 
              fillRule="evenodd" 
              d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" 
              clipRule="evenodd" 
            />
          </svg>
        ) : (
          <svg 
            className="w-4 h-4 sm:w-5 sm:h-5" 
            fill="currentColor" 
            viewBox="0 0 20 20"
          >
            <path 
              fillRule="evenodd" 
              d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM12.293 7.293a1 1 0 011.414 0L15 8.586l1.293-1.293a1 1 0 111.414 1.414L16.414 10l1.293 1.293a1 1 0 01-1.414 1.414L15 11.414l-1.293 1.293a1 1 0 01-1.414-1.414L13.586 10l-1.293-1.293a1 1 0 010-1.414z" 
              clipRule="evenodd" 
            />
          </svg>
        )}
      </motion.button>

      {/* 权限状态提示 */}
      {!isSupported && (
        <span className="text-xs text-yellow-400 px-2 py-1">
          ⚠️ 需HTTPS
        </span>
      )}
      
      {permissionStatus === 'denied' && isSupported && (
        <span className="text-xs text-red-400 px-2 py-1">
          🚫 权限被拒
        </span>
      )}
    </div>
  )
}

export default VoiceControl