/**
 * 使用情况汇总
 */
export class UsedSummaryInFile {
  /**
   * 文件路径
   */
  fileUri: string = '';

  /**
   * 基本假设
   * 同一文件内, uiLib之间别名不会重复, 组件之间别名不会重复, (uiLib和compontent的别名可以重复)
   */
  usedLib: Map<string, UsedLib> = new Map();
  /**
   * 记录uiLib的别名列表, 方便查询
   */
  aliasLibNameMap: Map<string, string> = new Map();

  constructor(fileUri: string) {
    this.fileUri = fileUri;
  }

  /**
   * 获取组件别名实际对应的组件库名
   * @param aliasLibName
   */
  private getRealLibName(aliasLibName: string) {
    return this.aliasLibNameMap.get(aliasLibName);
  }

  /**
   * 检查uiLibName是否被注册过
   * @param uiLibName
   */
  private isLibNameRegisted(uiLibName: string) {
    return this.aliasLibNameMap.has(uiLibName);
  }

  /**
   * 注册uiLibName和别名之间的关系
   * @param libName
   * @param aliasName
   */
  private registLibNameAndAliasName(libName: string, aliasName: string) {
    return this.aliasLibNameMap.set(aliasName, libName);
  }

  /**
   * 添加uiLib记录
   * @param libName
   */
  addLib(libName: string) {
    // 检查uiLibName是否为别名
    if (this.isLibNameRegisted(libName)) {
      // 已被注册, 直接返回即可
      return;
    }
    let newLib = new UsedLib(libName);
    this.usedLib.set(libName, newLib);
    // 在别名库里注册上
    this.registLibNameAndAliasName(libName, libName);
    return;
  }

  /**
   * 为组件库添加别名
   * @param libName
   * @param aliasName
   */
  addLibAlias(libName: string, aliasName: string) {
    if (this.isLibNameRegisted(aliasName)) {
      // 别名已注册, 直接返回即可
      return;
    }

    if (this.isLibNameRegisted(libName)) {
      // 组件库已存在
      // 先获取本名
      let realUiLibName = this.getRealLibName(libName);
      // 再注册别名
      this.registLibNameAndAliasName(realUiLibName, aliasName);
      return;
    }

    // 组件库不存在, 先注册组件库, 再注册组件别名
    this.addLib(libName);
    this.registLibNameAndAliasName(libName, aliasName);
  }

  /**
   * 向组件库中添加组件
   * @param libName
   * @param compontentName
   */
  addCompontent(libName: string, compontentName: string) {
    if (this.isLibNameRegisted(libName) === false) {
      // 如果uiLib不存在, 需要先行注册
      this.addLib(libName);
    }

    // 向uiLib中添加组件
    let realLibName = this.getRealLibName(libName);
    let usedLib = this.usedLib.get(realLibName);
    usedLib.addCompontent(compontentName);

    // 将结果设置回uiLibSummary
    this.usedLib.set(realLibName, usedLib);
  }

  /**
   * 向组件库中添加组件库别名
   * @param libName
   * @param compontentName
   * @param compontentNameAlias
   */
  addCompontentAlias(libName: string, compontentName: string, compontentNameAlias: string) {
    if (this.isLibNameRegisted(libName) === false) {
      // 如果uiLib不存在, 需要先行注册
      this.addLib(libName);
    }

    // 向uiLib中添加组件别名
    let realLibName = this.getRealLibName(libName);
    let libSumamry = this.usedLib.get(realLibName);
    libSumamry.addCompontentAlias(compontentName, compontentNameAlias);

    // 将结果设置回uiLibSummary
    this.usedLib.set(realLibName, libSumamry);
  }

  /**
   * compontent使用数+1
   * @param libName
   * @param compontentName
   */
  incrCompontentUseCount(libName: string, compontentName: string) {
    if (this.isLibNameRegisted(libName) === false) {
      // 如果uiLib不存在, 需要先行注册
      this.addLib(libName);
    }

    // 向uiLib中添加组件别名
    let realLibName = this.getRealLibName(libName);
    let libUsedSumamry = this.usedLib.get(realLibName);
    libUsedSumamry.incrCompontentUseCount(compontentName, this.fileUri);

    // 将结果设置回uiLibSummary
    this.usedLib.set(realLibName, libUsedSumamry);
  }

  /**
   * 组件库使用数+1
   * @param libName
   */
  incrLibUseCount(libName: string) {
    if (this.isLibNameRegisted(libName) === false) {
      // 如果uiLib不存在, 需要先行注册
      this.addLib(libName);
    }

    // 向uiLib中添加组件别名
    let realLibName = this.getRealLibName(libName);
    let libUsedSumamry = this.usedLib.get(realLibName);
    libUsedSumamry.incrLibUseCount(this.fileUri);

    // 将结果设置回uiLibSummary
    this.usedLib.set(realLibName, libUsedSumamry);
  }

  /**
   * 检查是否是注册过的组件库名
   * @param targetName
   */
  isRegistedLibName(targetName: string) {
    return this.isLibNameRegisted(targetName);
  }

  /**
   * 检查是否是注册过的组件名
   * @param targetName
   */
  isRegistedCompontentName(targetName: string) {
    for (let uiLib of this.usedLib.values()) {
      if (uiLib.isRegistedCompontentName(targetName) === true) {
        return true;
      }
    }
    return false;
  }

  /**
   * 检查是否是注册过的组件名
   * @param targetName
   */
  getCompontentNameBelongToLib(targetName: string) {
    for (let uiLib of this.usedLib.values()) {
      if (uiLib.isRegistedCompontentName(targetName) === true) {
        return uiLib.name;
      }
    }
    return;
  }
}

/**
 * 使用的组件库
 */
class UsedLib {
  /**
   * npm包名
   */
  name: string;
  /**
   * 导入npm包后, 引入的别名
   * 例如:
   * import * as K from 'lodash', 此时K即为lodash的别名
   */
  aliasNameSet: Set<string>;

  /**
   * 组件库本身也可能被直接使用
   * fileUri => useCount
   * 示例
   *
   * import axios from "axios"
   * axios("GET", "https://www.baidu.com")
   *
   */
  directUseSummary: Map<string, number> = new Map();

  /**
   * 记录compontent的别名列表, 方便查询
   */
  aliasCompontentNameMap: Map<string, string> = new Map();

  compontentSummary: Map<string, UsedCompontent> = new Map();

  constructor(libName: string) {
    this.name = libName;
    this.aliasNameSet = new Set([libName]);
  }

  /**
   * 检查compontentName是否被注册过
   * @param compontentName
   */
  private isCompontentNameRegisted(compontentName: string) {
    return this.aliasCompontentNameMap.has(compontentName);
  }

  /**
   * 注册别名和原组件之间的关系
   * @param compontentName
   * @param aliasName
   */
  private registCompontentNameAndAliasName(compontentName: string, aliasName: string) {
    return this.aliasCompontentNameMap.set(aliasName, compontentName);
  }

  /**
   * 获取组件别名实际对应的组件名
   * @param compontentAliasName
   */
  private getRealCompontentName(compontentAliasName: string) {
    return this.aliasCompontentNameMap.get(compontentAliasName);
  }

  /**
   * 注册组件
   * @param compontentName
   */
  addCompontent(compontentName: string) {
    if (this.isCompontentNameRegisted(compontentName)) {
      // 这个组件已经注册过, 自动跳过
      return;
    }
    let compontentSummary = new UsedCompontent(compontentName);
    this.compontentSummary.set(compontentName, compontentSummary);
    this.registCompontentNameAndAliasName(compontentName, compontentName);
    return;
  }

  /**
   * 注册组件别名
   * @param compontentName 组件名(本身也可能是别名)
   * @param compontentAliasName 组件别名
   */
  addCompontentAlias(compontentName: string, compontentAliasName: string) {
    if (this.isCompontentNameRegisted(compontentAliasName)) {
      // 别名只允许注册一次
      return;
    }

    if (this.isCompontentNameRegisted(compontentName)) {
      // 组件已注册
      // 获取compontentName对应的本名
      let realCompontentName = this.getRealCompontentName(compontentName);
      this.registCompontentNameAndAliasName(realCompontentName, compontentAliasName);
      return;
    }

    // 组件未注册, 先注册组件
    this.addCompontent(compontentName);
    // 再注册组件别名
    this.registCompontentNameAndAliasName(compontentName, compontentAliasName);
    return;
  }

  /**
   * compontent在fileUri中使用数+1
   *
   * @param compontentName
   * @param fileUri
   */
  incrCompontentUseCount(compontentName: string, fileUri: string) {
    this.addCompontent(compontentName);
    // 获取组件本名
    let realCompontentName = this.getRealCompontentName(compontentName);

    let compontentSummary = this.compontentSummary.get(realCompontentName);
    compontentSummary.incrUseCount(fileUri);
    // 重新更新回去
    this.compontentSummary.set(realCompontentName, compontentSummary);
  }

  /**
   * lib在fileUri中使用数+1
   *
   * @param compontentName
   * @param fileUri
   */
  incrLibUseCount(fileUri: string) {
    let oldUseCount = 0;
    if (this.directUseSummary.has(fileUri)) {
      oldUseCount = this.directUseSummary.get(fileUri);
    }
    this.directUseSummary.set(fileUri, oldUseCount + 1);
  }

  /**
   * 检查是否是注册过的组件名
   * @param testName
   */
  isRegistedCompontentName(testName: string) {
    return this.isCompontentNameRegisted(testName);
  }
}

/**
 * 使用的组件
 */
class UsedCompontent {
  name: string;
  aliasNameSet: Set<string>;

  /**
   * 使用统计
   */
  useSummary: Map<string, number> = new Map();

  constructor(name: string) {
    this.name = name;
    this.aliasNameSet = new Set([name]);
  }

  addAliasName(aliasName: string) {
    this.aliasNameSet.add(aliasName);
    return;
  }

  incrUseCount(fileUri: string) {
    let oldUseCount = 0;
    if (this.useSummary.has(fileUri)) {
      oldUseCount = this.useSummary.get(fileUri);
    }
    this.useSummary.set(fileUri, oldUseCount + 1);
    return;
  }
}
