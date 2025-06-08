import React, { useState, useEffect } from 'react';
import { View, Text, Input, Button } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { User } from '@/types';

interface UserSettingsProps {
  user: User;
  onUpdate: (updatedUser: User) => void;
}

const UserSettings: React.FC<UserSettingsProps> = ({ user, onUpdate }) => {
  const [nickname, setNickname] = useState(user.nickname || '');
  const [avatar, setAvatar] = useState(user.avatar || '');

  useEffect(() => {
    setNickname(user.nickname || '');
    setAvatar(user.avatar || '');
  }, [user]);

  const handleUpdate = async () => {
    const updatedUser = {
      ...user,
      nickname,
      avatar,
    };

    // 调用后端 API 更新用户信息
    try {
      await request({
        url: '/api/user/update',
        method: 'POST',
        data: updatedUser,
      });

      onUpdate(updatedUser);
      Taro.showToast({
        title: '更新成功',
        icon: 'success',
        duration: 2000,
      });
    } catch (error) {
      Taro.showToast({
        title: '更新失败',
        icon: 'none',
        duration: 2000,
      });
    }
  };

  return (
    <View className="p-4">
      <Text className="text-xl font-bold mb-4">完善资料</Text>
      <View className="mb-4">
        <Text className="block text-sm font-medium text-gray-700 mb-2">昵称</Text>
          <Input
            type="text"
            value={nickname}
            onInput={(e) => setNickname(e.detail.value)}
            className="w-full rounded-lg border border-gray-300 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#F52E6B] focus:border-transparent"
            placeholder="请输入昵称"
          />
      </View>
      <View className="mb-4">
        <Text className="block text-sm font-medium text-gray-700 mb-2">头像</Text>
          <Input
            type="text"
            value={avatar}
            onInput={(e) => setAvatar(e.detail.value)}
            className="w-full rounded-lg border border-gray-300 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#F52E6B] focus:border-transparent"
            placeholder="请输入头像URL"
          />
      </View>
      <Button
        type="primary"
        className="w-full bg-[#F52E6B] text-white py-3 rounded-lg font-medium hover:bg-[#FE6587]"
        onClick={handleUpdate}
      >
        保存
      </Button>
    </View>
  );
};

export default UserSettings;
