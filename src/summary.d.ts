// 汇总最终数据

/**
 * ui lib 使用次数
 */
export type TypeUiLibReport = {
  /**
   * 组件库名
   */
  libName: string;

  /**
   * 组件库被直接使用次数
   */
  directUseCount: number;
  /**
   * 按文件统计组件库被直接使用次数
   */
  useFileUriList: {
    uri: string;
    count: number;
  }[];

  /**
   * 组件库内组件累计被使用次数
   */
  compontentUseCount: number;
  /**
   * 组件库内列表
   */
  compontentDetailList: TypeCompontentReport[];
};

/**
 * 组件使用次数
 */
export type TypeCompontentReport = {
  /**
   * 组件名
   */
  compontentName: string;
  /**
   * 组件被使用次数
   */
  useCount: number;
  /**
   * 按文件统计组件被使用次数
   */
  useFileUriList: {
    uri: string;
    count: number;
  }[];
};
