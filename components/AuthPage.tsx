import React, { useState, useRef, useCallback } from 'react';
import { View, Text, Image, Button, Checkbox, CheckboxGroup, Input } from '@tarojs/components';
import Taro from '@tarojs/taro';
import './AuthPage.scss';
import '../app.scss';
import { store as authStore } from '@/store/auth';
import { loginAndRedirect } from '@/utils/auth';
import logo1 from '@/assets/images/logo1.png';
import logo2 from '@/assets/images/logo2.png';
import logo3 from '@/assets/images/logo3.png';
import logo4 from '@/assets/images/logo4.png';
import logo5 from '@/assets/images/logo5.png';
import logo6 from '@/assets/images/logo6.png';
import logo7 from '@/assets/images/logo7.png';



interface LoginResponse {
  code: number;
  message: string;
  data: {
    token: string;
    userInfo: {
      id: string;
      nickname: string;
      avatar?: string;
      isNew?: boolean;
      phone?: string;
    };
  };
}

const AuthPage = () => {
  const [isAgreed, setIsAgreed] = useState(false);
  const [mode, setMode] = useState<'main' | 'phone' | 'verify'>('main');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isGettingProfile, setIsGettingProfile] = useState(false);
  const loginLockRef = useRef(false);
const logoList = [logo1, logo2, logo3, logo4, logo5, logo6, logo7];
const randomLogo = logoList[Math.floor(Math.random() * logoList.length)];

  const handleWechatPhoneLogin = async (e) => {
    if (loginLockRef.current) {
      Taro.showToast({ title: '登录请求处理中，请勿重复点击', icon: 'none', duration: 1500 });
      return;
    }

    if (!e.detail?.encryptedData || !e.detail?.iv) {
      Taro.showToast({ title: '需要授权手机号才能登录', icon: 'none', duration: 1500 });
      return;
    }

    loginLockRef.current = true;
    Taro.showLoading({ title: '登录中...', mask: true });

    try {
      const { encryptedData, iv } = e.detail;
      const loginRes = await Taro.login();
      const { code: wechatCode } = loginRes;

      const response = await Taro.request<LoginResponse>({
        url: `${import.meta.env.VITE_API_BASE_URL}/api/wechat/phone`,
        method: 'POST',
        data: { code: wechatCode, encryptedData, iv },
        header: { 'Content-Type': 'application/json' },
      });

      const { code: respCode, data, message } = response.data;
      if (respCode !== 0 || !data?.token || !data?.userInfo) {
        throw new Error(message || '登录失败');
      }

      const { token, userInfo } = data;

      Taro.setStorageSync('token', token);
      Taro.setStorageSync('userInfo', userInfo);
      authStore.setUser(userInfo); // ✅ 必须调用

      if (userInfo?.isNew) {
        Taro.hideLoading();
        Taro.showModal({
          title: '完善资料',
          content: '是否授权头像昵称用于更好展示？',
          success: async (res) => {
            if (res.confirm && !isGettingProfile) {
              setIsGettingProfile(true);
              try {
const profileRes = await Taro.getUserProfile({ desc: '完善个人资料' });
const { nickName, avatarUrl } = profileRes.userInfo;

await Taro.request({
  url: `${import.meta.env.VITE_API_BASE_URL}/api/user/update-profile`,
  method: 'POST',
  header: { Authorization: `Bearer ${token}` },
  data: {
    
    avatar_url: avatarUrl // ✅ 只改这个字段名即可
  }
});

                Taro.showToast({ title: '资料已更新', icon: 'success' });
              } catch {
                Taro.showToast({ title: '授权失败', icon: 'none' });
              } finally {
                setIsGettingProfile(false);
              }
            }
            console.log('准备跳转到首页 tab 页');
            Taro.switchTab({ url: '/pages/Home' });
          },
        });
      } else {
        Taro.hideLoading();
        console.log('准备跳转到首页 tab 页');
        Taro.switchTab({ url: '/pages/Home' });
      }
    } catch (err: any) {
      console.error('微信登录失败:', err);
      Taro.showToast({ title: err.message || '登录失败', icon: 'none' });
    } finally {
      loginLockRef.current = false;
      Taro.hideLoading();
    }
  };

  const handleSendCode = useCallback(async () => {
    setErrorMsg('');
    if (!isAgreed) {
      Taro.showToast({ title: '请先同意协议', icon: 'none' });
      return;
    }
    if (!/^[1][3-9][0-9]{9}$/.test(phone)) {
      setErrorMsg('请输入有效的11位手机号');
      return;
    }
    try {
      setCountdown(60);
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      await Taro.request({
        url: `${import.meta.env.VITE_API_BASE_URL}/api/auth/send-code`,
        method: 'POST',
        data: { phone },
      });
      Taro.showToast({ title: '验证码已发送', icon: 'success' });
      setMode('verify');
    } catch {
      setErrorMsg('验证码发送失败');
    }
  }, [phone, isAgreed]);

  const handleVerifyCode = useCallback(async () => {
    setErrorMsg('');
    if (!isAgreed) {
      Taro.showToast({ title: '请先同意协议', icon: 'none' });
      return;
    }
    if (!code) {
      setErrorMsg('请输入验证码');
      return;
    }
    try {
      const response = await Taro.request<LoginResponse>({
        url: `${import.meta.env.VITE_API_BASE_URL}/api/auth/verify-code`,
        method: 'POST',
        data: { phone, code },
      });
      const { data } = response.data;
      const { token, userInfo } = data;
      //Taro.setStorageSync('token', token);
      //Taro.setStorageSync('userInfo', userInfo);
      loginAndRedirect(token, userInfo);
      const tip = userInfo?.isNew ? '注册成功' : '登录成功';
      Taro.showToast({ title: tip, icon: 'success' });
      Taro.switchTab({ url: '/pages/Home' });
    } catch {
      setErrorMsg('验证码错误或已过期');
    }
  }, [phone, code, isAgreed]);

  return (
    <View className='auth-page'>
      <View className='auth-header'>
        <View className='logo-container'>
          <Image className='logo-image' src={randomLogo} />
        </View>
        <Text className='auth-title'>旅行者平台</Text>
        <Text className='auth-subtitle'>探索世界的每一个角落</Text>
      </View>

      <View className='auth-container'>
        {mode === 'main' && (
          <View className='auth-buttons'>
            {!isAgreed ? (
              <Button className='login-btn wechat-btn' onClick={() => Taro.showToast({ title: '请先勾选协议', icon: 'none' })}>
                微信一键登录
              </Button>
            ) : (
              <Button
                className='login-btn wechat-btn'
                openType='getPhoneNumber'
                onGetPhoneNumber={handleWechatPhoneLogin}
                loading={isLoggingIn}
              >
                微信一键登录
              </Button>
            )}
  {/*          <Button className='login-btn phone-btn' onTap={() => setMode('phone')}>
             手机登录
           </Button>
           */}
          </View>
        )}

        {mode === 'phone' && (
        <View className='phone-login-container'>
  <View className='input-group'>
    <Input
      className='input'
      type='number'
      placeholder='请输入手机号'
      value={phone}
      onInput={(e) => setPhone(e.detail.value)}
    />
    <View className='send-code-btn' onTap={handleSendCode}>
      {countdown > 0 ? `${countdown}s` : '发送验证码'}
    </View>
  </View>

  {/* ✅ 错误提示单独一行，居中显示 */}
 {errorMsg && (
  <View className='error-msg-wrapper'>
    <Text className='error-msg'>{errorMsg}</Text>
  </View>
)}

  <Text className='back-link' onTap={() => setMode('main')}>
    返回
  </Text>
</View>

        )}

        {mode === 'verify' && (
          <View className='verify-container'>
            <View className='input-group'>
              <Input
                className='input'
                type='number'
                placeholder='输入验证码'
                value={code}
                onInput={(e) => setCode(e.detail.value)}
              />
            </View>
            <Button className='verify-btn' onTap={handleVerifyCode}>
              验证并登录
            </Button>
            {errorMsg && (
  <View className='error-msg-wrapper'>
    <Text className='error-msg'>{errorMsg}</Text>
  </View>
)}
            <Text className='back-link' onTap={() => setMode('phone')}>
              返回
            </Text>
          </View>
        )}

        <View className='agreement-area'>
          <CheckboxGroup onChange={(e) => setIsAgreed(e.detail.value.includes('agree'))}>
            <View className='agreement-checkbox'>
              <Checkbox value='agree' />
              <Text>我已阅读并同意</Text>
            </View>
          </CheckboxGroup>
          <View className='agreement-links'>
            <Text className='link' onTap={() => Taro.navigateTo({ url: '/pages/agreement/index' })}>
              《用户服务协议》
            </Text>
            <Text>和</Text>
            <Text className='link' onTap={() => Taro.navigateTo({ url: '/pages/privacy/index' })}>
              《隐私政策》
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};

export default AuthPage;
