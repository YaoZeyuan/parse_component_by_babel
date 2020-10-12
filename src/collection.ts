import { UsedSummaryInFile } from './summary';
import dayjs from 'dayjs';

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
  componentUseCount: number;
  /**
   * npm包内, 子组件列表
   */
  componentMap: Map<string, TypeComponentUsed>;
};
/**
 * 组件缓存名
 */
export type TypeComponentUsed = {
  /**
   * 组件名
   */
  componentName: string;
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
   *@useFileUriList 按文件统计组件库被直接使用次数
   */
  // useFileUriList: {
  //   uri: string;
  //   count: number;
  // }[];

  /**
   * 组件库内组件累计被使用次数
   */
  componentUseCount: number;
  /**
   * 组件库内列表
   */
  componentDetailList: TypeComponentReport[];
};

export type TypeFinalReport = {
  project: string;
  parseAtMs: number;
  parseAt_YMDHMS: string;
  reportList: TypeUiLibReport[];
};

/**
 * 组件使用次数
 */
export type TypeComponentReport = {
  /**
   * 组件名
   */
  componentName: string;
  /**
   * 组件被使用次数
   */
  useCount: number;
  /**
   * @deprecated 按文件统计组件被使用次数
   */
  // useFileUriList: {
  //   uri: string;
  //   count: number;
  // }[];
};

export class SummaryCollection {
  protected projectName: string = '';
  constructor(projectName: string) {
    this.projectName = projectName;
  }

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
        componentUseCount: 0,
        componentMap: new Map(),
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
      for (let rawComponentDetail of rawUiLibDetail.componentSummary.values()) {
        let componentName = rawComponentDetail.name;
        let componentUseDetail: TypeComponentUsed = {
          componentName: componentName,
          useCount: 0,
          fileUriMap: new Map(),
        };
        if (storeItem.componentMap.has(componentName)) {
          componentUseDetail = storeItem.componentMap.get(componentName);
        }

        // 记录组件在文件中的使用次数
        for (let fileUri of rawComponentDetail.useSummary.keys()) {
          let useCount = rawComponentDetail.useSummary.get(fileUri);
          let oldUseCount = componentUseDetail.fileUriMap.get(fileUri) || 0;
          componentUseDetail.fileUriMap.set(fileUri, useCount + oldUseCount);
        }
        let componentUseCount = 0;
        for (let subUseCount of componentUseDetail.fileUriMap.values()) {
          componentUseCount += subUseCount;
        }
        componentUseDetail.useCount = componentUseCount;
        storeItem.componentMap.set(componentName, componentUseDetail);
      }
      // 更新store内总的组件使用次数
      let componentTotalUseCount = 0;
      for (let componentUseDetail of storeItem.componentMap.values()) {
        componentTotalUseCount += componentUseDetail.useCount;
      }
      storeItem.componentUseCount = componentTotalUseCount;

      // 将数据更新回去
      this.summary.set(storeItem.libName, storeItem);
    }
  }

  public toJson(): TypeFinalReport {
    let resultList: TypeUiLibReport[] = [];
    if (this.summary.size === 0) {
      return {
        project: this.projectName,
        parseAtMs: Date.now(),
        parseAt_YMDHMS: dayjs().format('YYYY-MM-DD HH:mm:ss'),
        reportList: resultList,
      };
    }
    for (let rawUiLib of this.summary.values()) {
      // let directUseFileUriList: TypeUiLibReport['useFileUriList'] = [];
      // for (let fileUri of rawUiLib.directUseFileUriMap.keys()) {
      //   directUseFileUriList.push({
      //     uri: fileUri,
      //     count: rawUiLib.directUseFileUriMap.get(fileUri),
      //   });
      // }
      // // 排序
      // directUseFileUriList.sort((a, b) => {
      //   return a.count - b.count;
      // });

      let componentUseList: TypeComponentReport[] = [];
      for (let rawComponent of rawUiLib.componentMap.values()) {
        // let useFileUriList: TypeComponentReport['useFileUriList'] = [];
        // for (let fileUri of rawComponent.fileUriMap.keys()) {
        //   useFileUriList.push({
        //     uri: fileUri,
        //     count: rawUiLib.directUseFileUriMap.get(fileUri),
        //   });
        // }
        // // 排序
        // useFileUriList.sort((a, b) => {
        //   return a.count - b.count;
        // });

        componentUseList.push({
          componentName: rawComponent.componentName,
          useCount: rawComponent.useCount,
          // useFileUriList: useFileUriList,
        });
      }
      componentUseList.sort((a, b) => {
        // 从大到小
        return b.useCount - a.useCount;
      });

      let uiLib: TypeUiLibReport = {
        libName: rawUiLib.libName,
        directUseCount: rawUiLib.directUseCount,
        componentUseCount: rawUiLib.componentUseCount,
        componentDetailList: componentUseList,
        // useFileUriList: directUseFileUriList,
      };
      resultList.push(uiLib);
    }
    // 排序
    resultList.sort((a, b) => {
      // 从大到小
      return b.componentUseCount - a.componentUseCount;
    });
    return {
      project: this.projectName,
      parseAtMs: Date.now(),
      parseAt_YMDHMS: dayjs().format('YYYY-MM-DD HH:mm:ss'),
      reportList: resultList,
    };
  }
}
