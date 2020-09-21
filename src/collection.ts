import { UsedSummaryInFile } from './summary';

export type TypeLibUsed = {
  /**
   * npm包名
   */
  libName: string;

  /**
   * npm包被直接使用次数
   */
  directUseCount: number;

  /**
   * 按文件统计npm包被直接使用次数.
   * fileUri -> useCount
   */
  directUseFileUriMap: Map<string, number>;

  /**
   * npm包内组件总被使用次数
   */
  compontentUseCount: number;
  /**
   * npm包内, 子组件列表
   */
  compontentMap: Map<string, TypeCompontentUsed>;
};
/**
 * 组件缓存名
 */
export type TypeCompontentUsed = {
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

export class SummaryCollection {
  private summary: Map<string, TypeLibUsed> = new Map();

  /**
   * 每解析一个文件, 添加一次target, 因此target中使用的组件只会来自一个文件
   * @param target
   */
  public add(target: UsedSummaryInFile) {
    for (let rawUiLibDetail of target.usedLib.values()) {
      let uiLibName = rawUiLibDetail.name;
      let storeItem: TypeLibUsed = {
        libName: uiLibName,
        directUseFileUriMap: new Map(),
        directUseCount: 0,
        compontentUseCount: 0,
        compontentMap: new Map(),
      };
      if (this.summary.has(uiLibName)) {
        storeItem = this.summary.get(uiLibName);
      }

      // 开始合并

      // 更新直接使用次数
      let directUseCount = storeItem.directUseCount;

      // 首先记录在文件中直接使用的情况
      for (let fileUri of rawUiLibDetail.directUseSummary.keys()) {
        let useCount = rawUiLibDetail.directUseSummary.get(fileUri);

        // 直接使用次数++
        directUseCount = directUseCount + useCount;

        // 判断之前是否有过使用记录
        if (storeItem.directUseFileUriMap.has(fileUri)) {
          // 有使用记录累加
          let oldUseCount = storeItem.directUseFileUriMap.get(fileUri);
          storeItem.directUseFileUriMap.set(fileUri, useCount + oldUseCount);
        } else {
          // 无使用记录直接登记
          storeItem.directUseFileUriMap.set(fileUri, useCount);
        }
      }
      // 更新回storeItem里
      storeItem.directUseCount = directUseCount;

      // 其次合并各个组件的使用频率
      for (let rawCompontentDetail of rawUiLibDetail.compontentSummary.values()) {
        let compontentName = rawCompontentDetail.name;
        let compontentUseDetail: TypeCompontentUsed = {
          compontentName: compontentName,
          useCount: 0,
          fileUriMap: new Map(),
        };
        if (storeItem.compontentMap.has(compontentName)) {
          compontentUseDetail = storeItem.compontentMap.get(compontentName);
        }

        // 记录组件在文件中的使用次数
        for (let fileUri of rawCompontentDetail.useSummary.keys()) {
          let useCount = rawCompontentDetail.useSummary.get(fileUri);
          compontentUseDetail.fileUriMap.set(fileUri, useCount);
        }
        let compontentUseCount = 0;
        for (let subUseCount of compontentUseDetail.fileUriMap.values()) {
          compontentUseCount += subUseCount;
        }
        compontentUseDetail.useCount = compontentUseCount;
        storeItem.compontentMap.set(compontentName, compontentUseDetail);
      }
      // 更新store内总的组件使用次数
      let compontentTotalUseCount = 0;
      for (let compontentUseDetail of storeItem.compontentMap.values()) {
        compontentTotalUseCount += compontentUseDetail.useCount;
      }
      storeItem.compontentUseCount = compontentTotalUseCount;

      // 将数据更新回去
      this.summary.set(storeItem.libName, storeItem);
    }
  }

  public toJson(): TypeUiLibReport[] {
    let resultList: TypeUiLibReport[] = [];
    if (this.summary.size === 0) {
      return resultList;
    }
    for (let rawUiLib of this.summary.values()) {
      let directUseFileUriList: TypeUiLibReport['useFileUriList'] = [];
      for (let fileUri of rawUiLib.directUseFileUriMap.keys()) {
        directUseFileUriList.push({
          uri: fileUri,
          count: rawUiLib.directUseFileUriMap.get(fileUri),
        });
      }
      // 排序
      directUseFileUriList.sort((a, b) => {
        return a.count - b.count;
      });

      let compontentUseList: TypeCompontentReport[] = [];
      for (let rawCompontent of rawUiLib.compontentMap.values()) {
        let useFileUriList: TypeCompontentReport['useFileUriList'] = [];
        for (let fileUri of rawCompontent.fileUriMap.keys()) {
          useFileUriList.push({
            uri: fileUri,
            count: rawUiLib.directUseFileUriMap.get(fileUri),
          });
        }
        // 排序
        useFileUriList.sort((a, b) => {
          return a.count - b.count;
        });

        compontentUseList.push({
          compontentName: rawCompontent.compontentName,
          useCount: rawCompontent.useCount,
          useFileUriList: useFileUriList,
        });
      }
      compontentUseList.sort((a, b) => {
        return a.useCount - b.useCount;
      });

      let uiLib: TypeUiLibReport = {
        libName: rawUiLib.libName,
        directUseCount: rawUiLib.directUseCount,
        useFileUriList: directUseFileUriList,
        compontentDetailList: compontentUseList,
        compontentUseCount: rawUiLib.compontentUseCount,
      };
      resultList.push(uiLib);
    }
    // 排序
    resultList.sort((a, b) => {
      return a.compontentUseCount - b.compontentUseCount;
    });
    return resultList;
  }
}
