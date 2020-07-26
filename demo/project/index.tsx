// @ts-nocheck
import React, { Component } from 'react';
import { Image } from 'antd';

export class ImageItem extends Component<any, any> {
  static defaultProps = {
    style: {},
  };

  render() {
    return <Image>Hello World</Image>;
  }
}
