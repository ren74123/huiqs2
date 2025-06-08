import { View, Button, Input } from '@tarojs/components'
import { useState, useEffect } from 'react'
import Taro, { useRouter } from '@tarojs/taro'
import { sendSmsCode, loginWithPhone, saveUserInfo } from '../../services/auth'
import './index.scss'

export default function PhoneLogin() {
  const router = useRouter()
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [countdown, setCountdown] = useState(0)

  // 从路由参数中获取手机号
  useEffect(() => {
    const { phone: routerPhone } = router.params
    if (routerPhone) {
      setPhone(routerPhone)
    }
  }, [router.params])

  // 发送验证码
  const handleSendCode = async () => {
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      Taro.showToast({
        title: '请输入正确的手机号',
        icon: 'none'
      })
      return
    }

    try {
      setLoading(true)
      // 调用后端发送验证码接口
      await sendSmsCode({ phone })

      // 开始倒计时
      setCountdown(60)
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer)
            return 0
          }
          return prev - 1
        })
      }, 1000)

      Taro.showToast({
        title: '验证码已发送',
        icon: 'success'
      })
    } catch (error) {
      console.error('发送验证码失败:', error)
      Taro.showToast({
        title: '发送失败',
        icon: 'error'
      })
    } finally {
      setLoading(false)
    }
  }

  // 提交登录
  const handleSubmit = async () => {
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      Taro.showToast({
        title: '请输入正确的手机号',
        icon: 'none'
      })
      return
    }

    if (!/^\d{6}$/.test(code)) {
      Taro.showToast({
        title: '请输入6位验证码',
        icon: 'none'
      })
      return
    }

    try {
      setLoading(true)
      Taro.showLoading({ title: '登录中...' })

      // 调用后端登录接口
      const userInfo = await loginWithPhone({
        phone,
        code
      })

      // 保存用户信息
      saveUserInfo(userInfo)

      Taro.showToast({
        title: '登录成功',
        icon: 'success'
      })

      // 登录成功后返回上一页
      setTimeout(() => {
        Taro.navigateBack()
      }, 1500)

    } catch (error) {
      console.error('登录失败:', error)
      Taro.showToast({
        title: '登录失败',
        icon: 'error'
      })
    } finally {
      setLoading(false)
      Taro.hideLoading()
    }
  }

  return (
    <View className='phone-login'>
      <View className='login-title'>手机号登录</View>
      
      <View className='input-group'>
        <Input
          className='phone-input'
          type='number'
          placeholder='请输入手机号'
          maxlength={11}
          value={phone}
          onInput={e => setPhone(e.detail.value)}
        />
        
        <View className='code-group'>
          <Input
            className='code-input'
            type='number'
            placeholder='请输入验证码'
            maxlength={6}
            value={code}
            onInput={e => setCode(e.detail.value)}
          />
          <Button 
            className='send-code-btn'
            disabled={countdown > 0 || loading}
            onClick={handleSendCode}
          >
            {countdown > 0 ? `${countdown}s` : '获取验证码'}
          </Button>
        </View>
      </View>

      <Button
        className='submit-btn'
        loading={loading}
        onClick={handleSubmit}
      >
        登录
      </Button>
    </View>
  )
}