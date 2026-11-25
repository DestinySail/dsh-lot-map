# DeepSeek Harness 的 Lot Map（工作地图）

[English](README.md) | 中文

1:1 移植自 [alexeyw/lot-map](https://github.com/alexeyw/lot-map)（MIT）：一张贴在对话旁边、实时显示 Agent 正在干活的工作地图。每次工具调用、每个模型步骤、每个钩子、技能与子代理都会从中心向它所属的站点发出一条脉冲——于是你看到的是记忆、文件、终端、网络、浏览器和代理在工作，而不是读一串命令。

它只在你本机运行，不向任何地方发送数据。

## 安装

- 在 DSH 里：**插件 → 插件市场**，搜索 `dsh-lot-map`，安装。
- 命令行安装（装完重启 DSH）：

  ```sh
  dsh plugin --profile <profile> add github:DestinySail/dsh-lot-map
  ```

## 打开方式

任选其一：

- 对话头部工具栏里的地图按钮（有东西在跑时会出现一个小圆点）；
- 右侧栏 **插件 → 导览** 里的 **工作地图** 卡片；
- `Alt+Shift+M`；
- 输入框里的 `/lot-map`。

## 会点亮哪些站点

| 站点 | 什么时候亮 |
| --- | --- |
| 你 | 你的消息、提问、发给你的文件、任务清单、目标、计划，以及需要你审批的请求 |
| 模型 | 每个模型步骤、切换模型、上下文压缩 |
| 记忆 | `mnemon_*` 工具、`MEMORY.md` / `USER.md` 的读写、你配置的记忆类命令 |
| 文件 | `read`、`write`、`edit`、`grep`、`glob`、`read_image`、office 工具，以及只碰文件的 shell 命令（`cat`、`grep`、`mv`、`rm`、`sed`、`Get-Content`、`Select-String` 等） |
| 终端 | 其余所有 shell 命令，以及后台任务 |
| 网络 | `web_fetch`、各种搜索工具、MCP 服务器，以及已知会联网的 shell 命令（`curl`、`gh`、`ssh`、`git push`、`npm install`、`docker pull` 等） |
| 浏览器 | 浏览器、Playwright 与 Chrome MCP 工具 |
| 代理 | `subagent`、`subagent_fork`、`workflow`、定时任务，以及代理之间的消息 |
| 技能 | `skill`、插件与技能目录 |
| 钩子 | 钩子或运行时注入的上下文，以及被守卫拒绝的调用 |

终端类站点按命令名归类：`git status` 归终端，`git push` 归网络，`cat a | grep b` 归文件。包着别的命令执行的命令按内层那条算（`sudo`、`env`、`timeout`、`xargs`、`docker exec`、`bash -c`、`pwsh -Command`），here-document 里的文本不会被读取。

## 怎么读这张图

- **轨迹**连着主循环最近走过的几个站点；一条腿停留 40 秒，再用 20 秒淡出。
- **用旧的辐条**会变粗，于是这张图记得活是从哪儿走的。
- **运行中站点周围的时钟指针**：内圈一分钟一圈，外圈十分钟一圈。
- **中心外的那道环**是上下文窗口占用；到 70% 转琥珀色，90% 转红。
- **脉冲**在调用开始时向外飞，结束时飞回来；拒绝和错误会变红，并留下一个带计数的红点，直到你发下一条消息。
- **子代理**在委派调用运行期间绕着「代理」站点转。
- **地图下方**：正在跑什么，然后是最近 16 行。同一站点连续完成的调用会折叠成一行（`+2`）；过长的行点开 `▸` 展开。

每行显示自己的耗时；开启 `contextCost` 后还会显示这次调用大约让上下文涨了多少 token（`85 ms +42k`，共享或不完整时显示 `~`），地图上每个站点还显示本次会话的累计（`9 · 180k`）。这是估算：DSH 按步骤报告 prompt 用量，所以某次调用的数字会在下一个步骤答复时才落定。

## 选项

点面板里的 **⚙**，或直接改 `localStorage['dsh.lot-map.settings.v1']`。

| 选项 | 默认 | 含义 |
| --- | --- | --- |
| `language` | `auto` | `auto` 跟随界面；也可写 `en`、`zh` |
| `coreName` | `DSH` | 中心圆里显示的字，最多十个字符 |
| `theme` | `auto` | `dark`、`light`，或 `auto` 跟随 DSH 主题 |
| `background` | `solid` | 地图自己的底色；`transparent` 则透出背后的面板 |
| `paneBackground` | `theme` | 面板本身的底色：`theme`（宿主侧栏）、`solid`（地图底色）、`transparent`，或 `#rrggbb` |
| `layout` | `you-top` | `you-top`；或 `you-bottom`，把整环转半圈 |
| `motion` | `full` | `reduced` 关掉所有飞行、扩散和旋转动画 |
| `contextCost` | 关 | 显示每次调用占上下文增长的比例 |
| `contextWindow` | `model` | 上下文环以什么为分母：`model`，或 `compaction`（可用时取自动压缩阈值） |
| `textSize` | `footnote` | `caption`、`footnote` 或 `body` |
| `logRows` | `16` | `16`，或 `fill` 填满面板能放下的行数 |
| `openAtStart` | 开 | 每个新会话自动打开面板 |
| `colors` | 无 | `accent=#7fb4ff,active=#b8d6ff`；可用的名字有 `background`、`node`、`line`、`spoke`、`text`、`label`、`faint`、`accent`、`active`、`error`、`memory`、`memoryActive`、`route` |

### 分类与钩子（`cordis.patch.yml`）

工具分类与钩子选项运行在宿主侧的 projection 里，可在 `cordis.patch.yml` 的 `config:` 下配置：

```yaml
- insert:
    - id: lot-map
      name: 'dsh-lot-map'
      config:
        memoryServers: memory,my-memory
        hookRecords: true
        hookReasons: true
```

| 选项 | 默认 | 含义 |
| --- | --- | --- |
| `memoryServers` | `memory` | 逗号分隔的 MCP 服务器名，它们的工具点亮「记忆」（一旦设置就替换默认值） |
| `memoryCommands` | 无 | 会点亮「记忆」的 shell 命令或脚本 |
| `memorySubcommands` | 无 | 记忆类命令之后允许出现在标签里的子命令 |
| `memoryPaths` | 无 | 路径子串：文件读写命中这些子串时归类为「记忆」 |
| `memoryLabels` | 无 | 记忆类工具的短标签（`tool=name`） |
| `serverStations` | 无 | 把 MCP 服务器路由到指定站点（`server=station`） |
| `commandStations` | 无 | 把 shell 命令路由到指定站点（`command=station`） |
| `hookRecords` | `false` | 从注入的记忆上下文里抽取 `[#123]` 记录号 |
| `hookReasons` | `false` | 显示守卫/沙箱拒绝原因的第一行（最多 72 字符） |

## 读取与保存了什么

插件注册一个会话 projection（`lotMap`），只折叠已提交的会话事件。标签取自工具参数：一个标签只保存路径的最后两段、URL 的主机名、工具名，或模型自己写的描述——从不保存文件内容、搜索模式、查询词或记忆正文。它不发起网络请求、不运行进程、不调用模型，也不往对话里加任何内容。偏好设置存在这个浏览器的 `localStorage` 里；地图本身只活在当前会话。

卸载插件会移除 projection、侧栏页签、头部按钮、快捷键和 `/lot-map`；已存的会话记录不受影响。

## 限制

- DSH 给每个子代理一个独立 Session，所以父会话的地图只在委派调用运行期间把子代理显示为绕行的圆点，不显示它自己的步骤。
- 模型切换标记（`◆ 旧 → 新`）只在单个会话内检测；按文件夹保存的跨会话模型历史没有持久化。
- DSH 没有设置类钩子事件，所以「钩子」站点显示的是注入的上下文与守卫拒绝，而不是设置钩子。
- 地图在面板变化时才重绘，中间的动效由 SMIL 动画承担——所以调用中的时钟指针是平滑的，但「运行中」那一行文字不会逐秒跳动。

## 许可

部分代码移植自 alexeyw/lot-map，MIT。本包同样以 MIT 发布。
