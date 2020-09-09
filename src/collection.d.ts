// 存储中间数据

export type TypeParseError = {
    uri: string;
    errorInfo: {
      name: string;
      message: string;
      stack: string;
    };
  };

export type TypeCacheUiLib = {
  /**
   * 组件库名
   */
  uiLibName: string;

  /**
   * 组件库本身被直接使用次数
   */
  directUseCount: number;
  /**
   * 统计文件内使用次数.
   * fileUri -> useCount
   */
  directUseFileUriMap: Map<string, number>;

  /**
   * 组件库内组件总被使用次数
   */
  compontentUseCount: number;
  /**
   * 组件库内, 子组件列表
   */
  compontentMap: Map<string, TypeCacheCompontent>;
};
/**
 * 组件缓存名
 */
export type TypeCacheCompontent = {
  /**
   * 组件名
   */
  compontentName: string;
  /**
   * 总使用次数
   */
  useCount: number;
  /**
   * 统计文件内使用次数.
   * fileUri -> useCount
   */
  fileUriMap: Map<string, number>;
};
