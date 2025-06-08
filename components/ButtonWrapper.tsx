import React from 'react'
import { View, Text } from '@tarojs/components'
import './ButtonWrapper.scss'

interface ButtonWrapperProps {
  variant?: 'default' | 'wechat' | 'outline' | 'ghost'
  size?: 'sm' | 'lg'
  loading?: boolean
  onClick?: (e?: any) => void | Promise<any>
  children?: React.ReactNode
}

const ButtonWrapper: React.FC<ButtonWrapperProps> = ({
  variant = 'default',
  size = 'lg',
  loading = false,
  onClick,
  children
}) => {
  const baseClasses = `button-wrapper ${variant} ${size} ${loading ? 'loading' : ''}`

  return (
    <View className={baseClasses} onClick={onClick}>
      {loading ? (
        <Text className="loading-text">加载中...</Text>
      ) : (
        children
      )}
    </View>
  )
}

export default ButtonWrapper
