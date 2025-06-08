import Taro from '@tarojs/taro';
import { View, Text } from '@tarojs/components';
import React, { Component } from 'react';
import './Navigation.less';

export default class Navigation extends Component {
  componentDidMount() {
    console.log('Navigation component mounted.');
  }

  render() {
    return (
      <View className='navigation-container'>
        <Text>导航栏</Text>
      </View>
    );
  }
}
