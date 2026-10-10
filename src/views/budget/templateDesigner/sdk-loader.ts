/**
 * 预算模板设计器 · 插件 SDK 加载器
 * ------------------------------------------------------------------
 * 职责：
 *   1. 动态注入外部插件 SDK 脚本（地址由环境变量 VITE_APP_BUDGET_DESIGNER_SDK 指定）；
 *   2. 脚本加载完成后，从 window 上取到设计器构造函数并实例化；
 *   3. 对宿主页面暴露统一的 BudgetDesignerSdk 接口（mount / getData / setData /
 *      preview / reset / destroy），屏蔽不同厂商 SDK 的差异，便于后期替换。
 *
 * 约定（插件 SDK 需满足的最小契约）：
 *   - 脚本加载后在 window 上挂载全局构造函数，默认取 window.BudgetTemplateDesigner，
 *     若不存在则回退到 window.__BUDGET_DESIGNER__；
 *   - new BudgetTemplateDesigner() 返回的实例需实现：
 *       mount(container: HTMLElement, options?: Record<string, any>): void
 *       getData(): any
 *       setData(data: any): void
 *       preview(): void
 *       reset(): void
 *       destroy(): void
 *   若插件 SDK 命名不同，可在下方 SDK_GLOBAL_KEYS 数组中追加候选 key。
 * ------------------------------------------------------------------
 */

/** 全局 SDK 构造函数的候选 key（按优先级） */
const SDK_GLOBAL_KEYS = ['BudgetTemplateDesigner', '__BUDGET_DESIGNER__', 'BudgetDesigner'];

/** 设计器实例统一接口 */
export interface BudgetDesignerSdk {
  /** 将设计器挂载到指定 DOM 容器 */
  mount(container: HTMLElement, options?: Record<string, any>): void;
  /** 取当前设计数据（JSON 序列化对象） */
  getData?(): any;
  /** 回填设计数据 */
  setData?(data: any): void;
  /** 预览 */
  preview?(): void;
  /** 重置为初始状态 */
  reset?(): void;
  /** 销毁实例、释放资源 */
  destroy?(): void;
}

/** 已加载的 SDK 单例（避免重复注入 script） */
let sdkConstructor: (new () => BudgetDesignerSdk) | null = null;
let loadPromise: Promise<(new () => BudgetDesignerSdk) | null> | null = null;

/** 动态加载外部 JS 脚本 */
const loadScript = (src: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`) as HTMLScriptElement | null;
    if (existing) {
      // 已注入但可能尚未加载完成
      if ((existing as any).__loaded) {
        resolve();
        return;
      }
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error(`SDK 脚本加载失败：${src}`)));
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = () => {
      (script as any).__loaded = true;
      resolve();
    };
    script.onerror = () => reject(new Error(`SDK 脚本加载失败：${src}`));
    document.head.appendChild(script);
  });
};

/** 从 window 上查找 SDK 构造函数 */
const resolveConstructor = (): (new () => BudgetDesignerSdk) | null => {
  const w = window as any;
  for (const key of SDK_GLOBAL_KEYS) {
    if (typeof w[key] === 'function') {
      return w[key] as new () => BudgetDesignerSdk;
    }
  }
  return null;
};

/**
 * 加载并返回设计器 SDK 构造函数。
 * 若环境变量未配置 SDK 地址，或脚本加载后未挂载全局构造函数，则抛出异常。
 */
export const loadDesignerSdk = async (): Promise<BudgetDesignerSdk> => {
  const sdkUrl = import.meta.env.VITE_APP_BUDGET_DESIGNER_SDK as string | undefined;
  if (!sdkUrl) {
    throw new Error('未配置 VITE_APP_BUDGET_DESIGNER_SDK，无法加载模板设计器插件');
  }

  if (sdkConstructor) {
    return new sdkConstructor();
  }

  if (!loadPromise) {
    loadPromise = (async () => {
      await loadScript(sdkUrl);
      const ctor = resolveConstructor();
      if (!ctor) {
        throw new Error(`SDK 脚本已加载，但未在 window 上找到设计器构造函数（候选：${SDK_GLOBAL_KEYS.join(', ')}）`);
      }
      sdkConstructor = ctor;
      return ctor;
    })();
  }

  const ctor = await loadPromise;
  if (!ctor) {
    throw new Error('设计器 SDK 构造函数不可用');
  }
  return new ctor();
};

/** 仅供测试/调试：手动设置构造函数（绕过脚本加载） */
export const __setDesignerConstructorForTest = (ctor: new () => BudgetDesignerSdk) => {
  sdkConstructor = ctor;
};
