# 代码自我检查规范 (QA Standard)

## 0. 执行原则 (Execution Policy)
在任何代码编写任务完成后，输出最终方案前，必须自动调用此规范进行审计。如发现不符项，需自我修正后方可提交。

---

## 1. 功能完备性核对 (Feature Audit)
- **依据**：必须与用户提供的《建设计划书》或原始需求文档进行对比。
- **检查项**：核实代码是否涵盖了计划书中要求的所有功能模块、逻辑分支及建设内容。
- **处理**：若有遗漏，必须予以补全或在报告中明确说明。

## 2. 安全性检查 (Security Check)
- **检查项**：严禁出现硬编码的敏感信息（如 API Keys、Token、数据库密码、内网 IP 等）。
- **要求**：必须引导用户使用环境变量（env）或加密存储。

## 3. 健壮性检查 (Robustness)
- **输入校验**：所有函数入口必须包含对入参的判空处理或类型校验（Guard Clauses）。
- **异常捕获**：关键逻辑处（特别是 I/O 操作、网络调用、数据库交互）必须包裹有效的 `try-catch` 或错误处理逻辑。

## 4. 注释规范 (Documentation)
- **逻辑注释**：对复杂的算法、非显而易见的逻辑分支必须添加行内注释。
- **要求**：注释需说明“设计意图”（Why）而不仅是“操作过程”（What）。

## 5. 性能评估 (Performance)
- **复杂度检查**：检查是否存在不必要的嵌套循环（O(n^2) 及以上）或重复的资源浪费。
- **优化要求**：在处理潜在的大规模数据时，优先考虑更优的空间或时间算法。

---

## 6. 自我纠正报告 (QA Audit Report)
若在执行上述检查时发现问题，请先修正代码。在最终代码块下方，必须附带以下格式的审计表格：

| 检查维度 | 状态 | 修正说明 (若有) |
| :--- | :--- | :--- |
| **功能完备性** | ✅/❌ | 是否完整覆盖计划书内容 |
| **安全性** | ✅/❌ | 是否清理硬编码敏感信息 |
| **健壮性** | ✅/❌ | 增加了哪些错误捕捉/参数校验 |
| **注释规范** | ✅/❌ | 复杂逻辑是否已添加说明 |
| **性能评估** | ✅/❌ | 是否存在性能隐患并优化 |

---

## 7. 历史问题追溯 (Lessons Learned)

本节记录实际开发中遇到的典型错误，作为后续检查的参考依据。

### 7.1 文本断句处理不完整

**项目**: english-reader
**时间**: 2026-01-13
**文件**: `src/utils/textParser.js`

#### 问题描述
使用简单正则 `[^.!?]+[.!?]+` 进行英文句子切分，导致以下情况被错误断开：
- 缩写词：`Mr.` `Dr.` `U.S.` `Ph.D.` `e.g.` `i.e.` 等
- 小数/金额：`$3.5 million` `3.14`
- 省略号：`...`
- 引号内标点：`"Hello!" she said.`

#### 根本原因
1. **边界情况考虑不足**：只保护了少量常见缩写（Mr./Mrs./Dr.），未考虑完整的英文缩写体系
2. **正则表达式过于简单**：未区分"句末终结符"和"缩写中的点号"
3. **缺乏测试用例覆盖**：未用包含边界情况的文本进行测试

#### 预防准则
| 场景 | 检查要点 |
|-----|---------|
| **文本解析** | 处理自然语言时，必须考虑缩写、数字、标点的特殊情况 |
| **正则切分** | 使用"保护-切分-恢复"三步法：先用占位符保护特殊模式，切分后再恢复 |
| **边界测试** | 文本处理函数必须用包含以下内容的测试用例验证：缩写词、小数、省略号、引号嵌套 |

#### 修复方案摘要
```javascript
// 1. 使用占位符保护特殊模式
processed = processed.replace(/(\d)\.(\d)/g, '$1\u0000NUM\u0000$2');  // 小数
processed = processed.replace(/\bMr\./g, 'Mr\u0000TITLE\u0000');      // 缩写

// 2. 执行切分
const sentences = processed.match(/[^.!?]*[.!?]+["'»」』）)]*\s*/g);

// 3. 恢复占位符
sentences = sentences.map(s => s.replace(/\u0000[A-Z]+\u0000/g, '.'));
```

---

### 7.2 装饰性符号导致断句错误

**项目**: english-reader
**时间**: 2026-01-14
**文件**: `src/utils/textParser.js`

#### 问题描述
文本中包含装饰性符号（中点 `·`、项目符号 `•`、星号分隔 `***` 等）时，这些符号被错误识别为独立的"句子"，导致：
- 出现只有符号的空句子（如第1704句只显示 `·`）
- 标点符号前的多余空格未清理（如 `word .` 而非 `word.`）
- 句子被符号错误分割，后半部分小写开头

#### 根本原因
1. **预处理不完整**：未清理文本中的装饰性符号和格式问题
2. **过滤条件不严格**：只检查 `s.length > 0`，未验证是否包含有效文字内容
3. **空格处理缺失**：未处理标点前的异常空格

#### 预防准则
| 场景 | 检查要点 |
|-----|---------|
| **文本预处理** | 切分前必须：1) 清理标点前空格 2) 移除装饰性符号 3) 规范化空格 |
| **结果过滤** | 句子必须包含至少2个英文字母才视为有效 |
| **特殊符号** | 必须处理：`·` `•` `◦` `‣` `⁃` `***` `---` 等常见装饰符 |

#### 修复方案摘要
```javascript
// 预处理: 清理格式问题
processed = processed.replace(/\s+([.!?,;:])/g, '$1');  // 标点前空格
processed = processed.replace(/[·•◦‣⁃]/g, ' ');        // 装饰性符号
processed = processed.replace(/\s+/g, ' ');             // 规范化空格

// 过滤无效句子
.filter(s => {
  if (s.length === 0) return false;
  if (!/[a-zA-Z]/.test(s)) return false;           // 必须有字母
  if (s.replace(/[^a-zA-Z]/g, '').length < 2) return false;  // 至少2个字母
  return true;
});
```

---

### 7.3 前端取词时标点粘连问题

**项目**: english-reader
**时间**: 2026-01-14
**文件**: `src/components/SentenceCard.jsx`, `src/utils/textParser.js`

#### 问题描述
前端屏幕取词功能使用简单的 `split(' ')` 切分句子，导致：
- 标点符号粘连在单词上（点击 "Hello." 获取到 "Hello." 而非 "Hello"）
- 缩写词被错误切分（"don't" 可能被当作 "don" 处理）
- 流式输出时 DOM 频繁重绘，点击难以触发

#### 根本原因
1. **分词逻辑过于简单**：`split(' ')` 只按空格切分，未区分单词与标点
2. **清理逻辑延后**：在 click handler 中用 `replace(/[.,!?;:'"]/g, '')` 清理，但无法处理所有边界情况
3. **缺乏性能优化**：每次渲染都重新计算分词，流式输出时造成性能问题

#### 预防准则
| 场景 | 检查要点 |
|-----|---------|
| **前端取词** | 必须在数据层将"单词"与"标点"分离，UI 上保持紧凑布局 |
| **交互热区** | onClick 只绑定在纯单词元素上，标点不可点击 |
| **特殊词汇** | 必须保护：缩写词 (don't, it's)、连字符词 (state-of-the-art)、数字金额 |
| **性能优化** | 使用 useMemo 缓存分词结果，useCallback 稳定事件处理函数 |

#### 修复方案摘要
```javascript
// 1. 智能分词函数 - 分离单词、标点、空格
export function tokenizeSentence(sentence) {
  const tokenRegex = /([A-Za-z]+(?:'[A-Za-z]+)+)|([A-Za-z]+(?:-[A-Za-z]+)+)|([A-Za-z]+)|([$€£¥]?\d+(?:\.\d+)?%?)|([.,!?;:'"()]+)|(\s+)/g;
  // ... 返回 [{text, type: 'word'|'punctuation'|'number'|'space'}]
}

// 2. React 组件中使用 useMemo 缓存
const tokens = useMemo(() => tokenizeSentence(sentence.text), [sentence.text]);

// 3. 渲染时分类处理
{tokens.map((token, index) => {
  if (token.type === 'word') {
    return <span className="word clickable" data-word={token.text} onClick={handleWordClick}>{token.text}</span>;
  } else if (token.type === 'punctuation') {
    return <span className="punctuation">{token.text}</span>;
  }
  // ...
})}

// 4. 使用 data-word 属性获取纯单词，无需二次清理
const handleWordClick = useCallback((event) => {
  const word = event.currentTarget.dataset.word;
  // ...
}, []);
```

---

### 7.4 TypeScript 路径别名未配置

**项目**: reading-kg-pwa
**时间**: 2026-01-18
**文件**: `tsconfig.json`

#### 问题描述
Next.js 项目使用 `@/*` 路径别名导入模块，但构建时报错：
- `Module not found: Can't resolve '@/lib/auth-context'`
- 所有使用 `@/` 前缀的导入都无法解析

#### 根本原因
1. **配置遗漏**：`tsconfig.json` 缺少 `baseUrl` 和 `paths` 配置
2. **模板不完整**：手动创建项目时未包含 Next.js 标准的路径别名设置
3. **本地开发未暴露**：某些环境下本地开发可能正常，但生产构建失败

#### 预防准则
| 场景 | 检查要点 |
|-----|---------|
| **Next.js + TypeScript** | `tsconfig.json` 必须包含 `baseUrl` 和 `paths` 配置 |
| **路径别名使用** | 使用 `@/*` 别名前，确认配置已就绪 |
| **项目初始化** | 优先使用 `create-next-app` 生成标准配置 |

#### 修复方案摘要
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    },
    "plugins": [
      {
        "name": "next"
      }
    ]
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"]
}
```

---

### 7.5 Supabase Database 类型定义不完整

**项目**: reading-kg-pwa
**时间**: 2026-01-18
**文件**: `src/types/database.ts`

#### 问题描述
手动编写 Supabase Database 类型定义后，执行 `.from("books").insert()` 时报错：
- `Argument of type 'BookInsert' is not assignable to parameter of type 'never'`
- TypeScript 认为表不存在或为只读

#### 根本原因
1. **类型结构不完整**：Supabase 客户端 v2.x 要求每个 Table 包含 `Relationships` 字段
2. **顶层字段缺失**：Database 类型缺少 `Functions`、`CompositeTypes` 等必需字段
3. **手写类型风险**：未使用 `supabase gen types` 自动生成，容易遗漏结构

#### 预防准则
| 场景 | 检查要点 |
|-----|---------|
| **Supabase 类型定义** | 每个 Table 必须包含 `Row`、`Insert`、`Update`、`Relationships` |
| **Database 顶层结构** | 必须包含 `Tables`、`Views`、`Functions`、`Enums`、`CompositeTypes` |
| **推荐做法** | 优先使用 `npx supabase gen types typescript` 自动生成类型 |

#### 修复方案摘要
```typescript
export type Database = {
  public: {
    Tables: {
      books: {
        Row: Book;
        Insert: BookInsert;
        Update: BookUpdate;
        Relationships: [
          // 外键关系定义
        ];
      };
    };
    Views: {
      // 视图定义，必须包含 Relationships: []
    };
    Functions: Record<string, never>;
    Enums: {
      // 枚举定义
    };
    CompositeTypes: Record<string, never>;
  };
};
```

---