// Browser UI entry for dsh-lot-map.
// Metro-style radial work map + turn-grouped activity feed for DeepSeek Harness.
window.__ModuleLoader__.load({
  id: 'dsh-lot-map',
  factory(require) {
    'use strict'
    const React = require('react')
    const h = React.createElement
    const { useState, useEffect, useMemo, useRef, useCallback } = React

    const TAB_ID = 'dsh-lot-map'
    const TAB_KIND = 'lot-map'
    const STORAGE_KEY = 'dsh.lot-map.settings.v1'
    const OPENED_KEY = 'dsh.lot-map.opened.v1'
    const STYLE_ID = 'dsh-lot-map-styles'

    // ---- Theme Palettes & 10 Metro Station Line Colors ----

    const DARK = {
      ground: '#0b1320',
      raised: '#111c2d',
      raise: '#17243a',
      line: '#22324c',
      spoke: '#22324c',
      bone: '#e8edf4',
      ash: '#9aa8bb',
      dim: '#5f7088',
      ok: '#3fbf6f',
      accent: '#4c8dff',
      hot: '#7fb4ff',
      red: '#ff5d5d',
      errTint: 'rgba(255, 93, 93, 0.12)',
      scrim: 'rgba(5, 9, 16, 0.6)',
      mem: '#1cc2b5',
      memHot: '#5ae0d4',
      trail: '#e8edf4',
      stations: {
        you: '#ffc20e',
        model: '#a875f0',
        memory: '#1cc2b5',
        files: '#4c8dff',
        shell: '#4cbb5c',
        web: '#ff9a3c',
        browser: '#ef72b8',
        agents: '#c09272',
        skills: '#6cc4f0',
        hooks: '#98a4b2',
      },
    }

    const LIGHT = {
      ground: '#f3f4f1',
      raised: '#ffffff',
      raise: '#eceee9',
      line: '#d7dbd3',
      spoke: '#d7dbd3',
      bone: '#141a22',
      ash: '#566170',
      dim: '#8d96a1',
      ok: '#23924c',
      accent: '#2f6fde',
      hot: '#1b5ec7',
      red: '#d93636',
      errTint: 'rgba(217, 54, 54, 0.09)',
      scrim: 'rgba(20, 26, 34, 0.28)',
      mem: '#00897f',
      memHot: '#006b63',
      trail: '#141a22',
      stations: {
        you: '#b88400',
        model: '#8247d1',
        memory: '#00897f',
        files: '#2f6fde',
        shell: '#2e8b3d',
        web: '#d9730d',
        browser: '#c9408c',
        agents: '#8a6446',
        skills: '#2b8fc4',
        hooks: '#7a8592',
      },
    }

    const COLOR_NAMES = {
      background: 'ground',
      node: 'raised',
      line: 'line',
      spoke: 'spoke',
      text: 'bone',
      label: 'ash',
      faint: 'dim',
      accent: 'accent',
      active: 'hot',
      error: 'red',
      memory: 'mem',
      memoryActive: 'memHot',
      route: 'trail',
    }

    // ---- Stations & Exact SVG Icon Paths ----

    function ringPath(x, y, r) {
      return `M${x - r} ${y}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`
    }

    const STATIONS = [
      { id: 'you', icon: `${ringPath(0, -3.6, 3.4)}M-6.5 8c0-4 3-6.2 6.5-6.2s6.5 2.2 6.5 6.2` },
      { id: 'model', icon: 'M-5 -5h10v10h-10zM-2 -8.5v3.5M2 -8.5v3.5M-2 5v3.5M2 5v3.5M-8.5 -2h3.5M-8.5 2h3.5M5 -2h3.5M5 2h3.5' },
      { id: 'memory', icon: `M-5 4.5L0 -5L6 3.5M-5 4.5L6 3.5${ringPath(-5, 4.5, 2.1)}${ringPath(0, -5, 2.1)}${ringPath(6, 3.5, 2.1)}` },
      { id: 'files', icon: 'M-5.5 -8h7.5l3.5 3.5v12.5h-11zM2 -8v3.5h3.5' },
      { id: 'shell', icon: 'M-7.5 -5l5 5l-5 5M0 6h7.5' },
      { id: 'web', icon: `${ringPath(0, 0, 7.8)}M-7.8 0h15.6M0 -7.8c-4.2 4.2 -4.2 11.4 0 15.6M0 -7.8c4.2 4.2 4.2 11.4 0 15.6` },
      { id: 'browser', icon: 'M-8.5 -6.5h17v13h-17zM-8.5 -2.8h17M-6.3 -4.7h.1M-3.8 -4.7h.1' },
      { id: 'agents', icon: `M0 -4v3.5M0 -.5L-6 4M0 -.5L6 4${ringPath(0, -6, 2.1)}${ringPath(-6.5, 5.5, 2.1)}${ringPath(6.5, 5.5, 2.1)}` },
      { id: 'skills', icon: 'M1.5 -8.5L-5.5 1h4.5l-1.5 7.5l7.5 -9.8h-4.5z' },
      { id: 'hooks', icon: `M2.5 -5.5v8a4.2 4.2 0 1 1 -8.4 0v-1.5${ringPath(2.5, -7.3, 1.8)}` },
    ]

    const STATION_IDS = new Set(STATIONS.map((s) => s.id))

    // ---- Strings (2 languages: en + zh) ----

    const STRINGS = {
      en: {
        title: 'Work map',
        guideDesc: 'Live map of tool calls, model steps, memory, skills, and subagents',
        zoomOut: 'Zoom out',
        zoomIn: 'Zoom in',
        hideMap: 'Hide map',
        showMap: 'Show map',
        settings: 'Settings',
        close: 'Close',
        reset: 'Reset defaults',
        expandRow: 'Expand full label',
        collapseRow: 'Collapse label',
        statusRunning: 'Running',
        statusIdle: 'Idle',
        activeCount: (n) => `${n} active`,
        lastTurnDuration: (d) => `last ${d}`,
        viewMode: 'View',
        viewMap: 'Map',
        viewList: 'List',
        contextLabel: 'Context',
        thisTurn: 'Turn',
        runningSection: 'Running',
        recentSection: 'Recent activity',
        filterOnly: (name) => `${name} only`,
        sessionCount: (n) => `${n} in session`,
        clearFilter: 'Clear',
        stationEmpty: 'No activity for this station.',
        turnTitle: (n) => `Turn ${n}`,
        initTurn: 'Session start',
        countTimes: (n) => String(n),
        grpAppearance: 'Appearance',
        grpMap: 'Map',
        grpFeed: 'Activity feed',
        grpGeneral: 'General',
        settingsHint: 'Saved locally on this device',
        notSet: 'Not set',
        configuredColors: (n) => `${n} set`,
        rows16: '16 rows',
        stations: {
          you: 'You', model: 'Model', memory: 'Memory', files: 'Files', shell: 'Shell',
          web: 'Network', browser: 'Browser', agents: 'Agents', skills: 'Skills', hooks: 'Hooks',
        },
        newMessage: 'new message',
        answerReady: 'answer ready',
        turnAborted: 'turn interrupted',
        step: (n) => `step ${n}`,
        subagent: 'subagent',
        compacting: 'compacting context',
        addedContext: (when) => `added context ${when}`,
        addedMemory: (when) => `added memory ${when}`,
        toMessage: 'to the message',
        atStart: 'at session start',
        records: (n, shown) => `${n} record${n === 1 ? '' : 's'}: ${shown}`,
        stopped: (tool) => `stopped ${tool}`,
        running: 'running',
        nothingYet: 'Nothing yet.',
        idle: 'Nothing is running.',
        context: 'context',
        andMore: (n) => ` and ${n} more`,
        webSearch: 'web search',
        artifact: 'artifact',
        workflow: 'workflow',
        skill: 'skill',
        loadingTools: 'loading tools',
        questionForYou: 'question for you',
        fileForYou: 'file for you',
        ms: (n) => `${n} ms`,
        seconds: (s) => `${s} s`,
        minutes: (m, s) => `${m} min ${s} s`,
        hours: (h, m) => `${h} h ${m} min`,
        opt: {
          language: 'Language', auto: 'Auto', coreName: 'Core name', theme: 'Theme',
          dark: 'Dark', light: 'Light', background: 'Map background', solid: 'Solid',
          transparent: 'Transparent', paneBackground: 'Pane background', paneTheme: 'Host theme',
          paneSolid: 'Map solid', paneCustom: 'Custom color',
          layout: 'Layout', youTop: 'You top', youBottom: 'You bottom',
          motion: 'Motion', full: 'Full', reduced: 'Reduced', contextCost: 'Context cost',
          contextWindow: 'Context ring', cwModel: 'Model window', cwCompaction: 'Compaction',
          textSize: 'Text size', caption: 'Small', footnote: 'Default', body: 'Large',
          logRows: 'Feed rows', fill: 'Fill', openAtStart: 'Open automatically',
          colors: 'Custom colors',
        },
      },
      zh: {
        title: '工作地图',
        guideDesc: '实时可视化工具调用、模型步骤、记忆、技能与子代理',
        zoomOut: '缩小',
        zoomIn: '放大',
        hideMap: '隐藏地图',
        showMap: '显示地图',
        settings: '设置',
        close: '关闭',
        reset: '恢复默认',
        expandRow: '展开完整标签',
        collapseRow: '收起标签',
        statusRunning: '运行中',
        statusIdle: '空闲',
        activeCount: (n) => `${n} 个调用`,
        lastTurnDuration: (d) => `上一轮 ${d}`,
        viewMode: '视图',
        viewMap: '地图',
        viewList: '仅列表',
        contextLabel: '上下文',
        thisTurn: '本轮',
        runningSection: '正在运行',
        recentSection: '最近活动',
        filterOnly: (name) => `只看${name}`,
        sessionCount: (n) => `本会话 ${n} 次`,
        clearFilter: '清除',
        stationEmpty: '该站点暂无活动。',
        turnTitle: (n) => `第 ${n} 轮`,
        initTurn: '会话初始化',
        countTimes: (n) => `${n} 次`,
        grpAppearance: '外观',
        grpMap: '地图',
        grpFeed: '活动流水',
        grpGeneral: '通用',
        settingsHint: '设置仅保存在本机',
        notSet: '未设置',
        configuredColors: (n) => `已设 ${n} 项`,
        rows16: '16 行',
        stations: {
          you: '你', model: '模型', memory: '记忆', files: '文件', shell: '终端',
          web: '网络', browser: '浏览器', agents: '代理', skills: '技能', hooks: '钩子',
        },
        newMessage: '新消息',
        answerReady: '回复就绪',
        turnAborted: '回合中断',
        step: (n) => `第 ${n} 步`,
        subagent: '子代理',
        compacting: '压缩上下文',
        addedContext: (when) => `${when}注入了上下文`,
        addedMemory: (when) => `${when}注入了记忆`,
        toMessage: '在消息中',
        atStart: '在会话开始时',
        records: (n, shown) => `${n} 条记录: ${shown}`,
        stopped: (tool) => `拦截了 ${tool}`,
        running: '运行中',
        nothingYet: '暂无活动。',
        idle: '当前空闲。',
        context: '上下文',
        andMore: (n) => ` 等另外 ${n} 项`,
        webSearch: '网络搜索',
        artifact: '产物',
        workflow: '工作流',
        skill: '技能',
        loadingTools: '加载工具',
        questionForYou: '向你提问',
        fileForYou: '发送文件',
        ms: (n) => `${n} ms`,
        seconds: (s) => `${s} s`,
        minutes: (m, s) => `${m} 分 ${s} 秒`,
        hours: (h, m) => `${h} 小时 ${m} 分`,
        opt: {
          language: '语言', auto: '跟随界面', coreName: '中心名称', theme: '主题',
          dark: '深色', light: '浅色', background: '地图底色', solid: '实色',
          transparent: '透明', paneBackground: '面板背景', paneTheme: '跟随宿主',
          paneSolid: '地图实色', paneCustom: '自定义色值',
          layout: '环形布局', youTop: '你在顶部', youBottom: '你在底部',
          motion: '动效', full: '完整', reduced: '减弱', contextCost: '显示上下文增量',
          contextWindow: '上下文环基准', cwModel: '模型窗口', cwCompaction: '压缩阈值',
          textSize: '字号', caption: '小', footnote: '默认', body: '大',
          logRows: '行数', fill: '填满', openAtStart: '新会话自动打开',
          colors: '自定义配色',
        },
      },
    }

    function stringsFor(lang) {
      return STRINGS[lang] || STRINGS.en
    }

    // ---- Formatting & Label Localization ----

    function cut(text, max) {
      if (typeof text !== 'string' || text.length <= max) return text || ''
      const all = [...text]
      return all.length > max ? `${all.slice(0, max - 1).join('')}…` : text
    }

    function clean(label, max = 120) {
      if (typeof label !== 'string') return ''
      const text = label.replace(/(?:(?![\u200c\u200d])[\p{Cc}\p{Cf}\p{Zl}\p{Zp}])+/gu, ' ').replace(/ {2,}/g, ' ').trim()
      return cut(text, max)
    }

    function shortModel(model) {
      if (typeof model !== 'string') return ''
      const raw = (model.includes('/') ? model.slice(model.lastIndexOf('/') + 1) : model).replace(/-\d{8}$/, '')
      const m = /claude-([a-z]+)-(\d+)(?:-(\d{1,2})(?!\d))?/i.exec(raw)
      if (m !== null) return `${m[1]} ${m[2]}${m[3] !== undefined ? `.${m[3]}` : ''}`
      return cut(raw, 22)
    }

    function formatMs(ms, t) {
      const tenths = Math.round(ms / 100)
      const seconds = Math.round(ms / 1000)
      if (Math.round(ms) < 1000) return t.ms(Math.max(1, Math.round(ms)))
      if (tenths < 600) return t.seconds((tenths / 10).toFixed(1))
      if (seconds < 3600) return t.minutes(Math.floor(seconds / 60), seconds % 60)
      const minutes = Math.round(seconds / 60)
      return t.hours(Math.floor(minutes / 60), minutes % 60)
    }

    function formatClock(ms) {
      const totalSec = Math.max(0, Math.floor(ms / 1000))
      const hrs = Math.floor(totalSec / 3600)
      const mins = Math.floor((totalSec % 3600) / 60)
      const secs = totalSec % 60
      if (hrs > 0) return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
      return `${mins}:${String(secs).padStart(2, '0')}`
    }

    function formatHm(ms) {
      if (typeof ms !== 'number' || !Number.isFinite(ms)) return ''
      const d = new Date(ms)
      return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
    }

    function formatTokens(tokens) {
      const n = Math.max(0, Math.round(tokens))
      if (n < 1000) return String(n)
      const k = Math.round(n / 1000)
      return k < 1000 ? `${k}k` : `${Math.round(n / 1_000_000)}M`
    }

    function localizeLabel(entry, t) {
      const args = Array.isArray(entry.labelArgs) ? entry.labelArgs : []
      switch (entry.labelKey) {
        case 'newMessage': return t.newMessage
        case 'answerReady': return t.answerReady
        case 'turnAborted': return t.turnAborted
        case 'compacting': return t.compacting
        case 'webSearch': return t.webSearch
        case 'artifact': return t.artifact
        case 'workflow': return t.workflow
        case 'skill': return t.skill
        case 'subagent': return t.subagent
        case 'loadingTools': return t.loadingTools
        case 'questionForYou': return t.questionForYou
        case 'fileForYou': return t.fileForYou
        case 'addedContextToMessage': return t.addedContext(t.toMessage)
        case 'addedContextAtStart': return t.addedContext(t.atStart)
        case 'addedMemoryToMessage': return t.addedMemory(t.toMessage)
        case 'addedMemoryAtStart': return t.addedMemory(t.atStart)
        case 'records': return t.records(args[0] ?? 0, args[1] ?? '')
        case 'stopped': return t.stopped(args[0] ?? 'tool')
        case 'modelStep': return `${args[0] ?? 'model'} · ${t.step(args[1] ?? 1)}`
        default: return entry.label || ''
      }
    }

    // ---- Setup & User Preferences ----

    const DEFAULT_PREFS = {
      language: 'auto',
      coreName: 'DSH',
      theme: 'auto',
      background: 'solid',
      paneBackground: 'theme',
      layout: 'you-top',
      motion: 'full',
      contextCost: false,
      contextWindow: 'model',
      textSize: 'footnote',
      logRows: 16,
      openAtStart: true,
      colors: '',
      minimized: false,
      zoom: null,
    }

    const ZOOMS = [160, 200, 240, 280, 340, 400]

    function parsePaneBackground(v) {
      const value = typeof v === 'string' ? v.trim().toLowerCase() : ''
      if (value === 'transparent' || value === 'solid' || value === 'theme') return value
      const digits = /^#([0-9a-f]{3}|[0-9a-f]{6})$/.exec(value)?.[1]
      if (digits === undefined) return 'theme'
      return `#${digits.length === 3 ? [...digits].map((d) => d + d).join('') : digits}`
    }

    function parseColors(raw) {
      const out = {}
      if (typeof raw !== 'string' || raw.trim() === '') return out
      for (const pair of raw.split(',').map((s) => s.trim()).filter(Boolean)) {
        const at = pair.indexOf('=')
        if (at < 1) continue
        const name = pair.slice(0, at).trim()
        const hex = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.exec(pair.slice(at + 1).trim())?.[0]?.toLowerCase()
        if (!hex) continue
        const normalized = hex.length === 4 ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}` : hex
        const legacyKey = COLOR_NAMES[name]
        if (legacyKey) {
          out[legacyKey] = normalized
          continue
        }
        const stationId = name.startsWith('station.') ? name.slice(8) : name
        if (STATION_IDS.has(stationId)) {
          out[stationId === 'memory' ? 'mem' : `station_${stationId}`] = normalized
        }
      }
      return out
    }

    function loadPrefs() {
      try {
        const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null
        if (!raw) return { ...DEFAULT_PREFS }
        const parsed = JSON.parse(raw)
        if (!parsed || typeof parsed !== 'object') return { ...DEFAULT_PREFS }
        return { ...DEFAULT_PREFS, ...parsed }
      } catch {
        return { ...DEFAULT_PREFS }
      }
    }

    function savePrefs(prefs) {
      try {
        if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
      } catch {
        // Ignore storage quota or privacy-mode errors.
      }
    }

    function resolveSetup(prefs, hostScheme, hostLang) {
      const langKey = prefs.language === 'auto'
        ? (STRINGS[hostLang] ? hostLang : (String(hostLang || '').toLowerCase().startsWith('zh') ? 'zh' : 'en'))
        : (STRINGS[prefs.language] ? prefs.language : 'en')
      const coreRaw = typeof prefs.coreName === 'string' ? [...clean(prefs.coreName)].slice(0, 10).join('').trim() : ''
      const resolvedTheme = prefs.theme === 'dark' || prefs.theme === 'light'
        ? prefs.theme
        : (hostScheme === 'light' ? 'light' : 'dark')
      return {
        t: stringsFor(langKey),
        langKey,
        core: coreRaw === '' ? 'DSH' : coreRaw,
        theme: resolvedTheme,
        background: prefs.background === 'transparent' ? 'transparent' : 'solid',
        paneBackground: parsePaneBackground(prefs.paneBackground),
        colors: parseColors(prefs.colors),
        layout: prefs.layout === 'you-bottom' ? 'you-bottom' : 'you-top',
        motion: prefs.motion === 'reduced' ? 'reduced' : 'full',
        contextCost: prefs.contextCost === true,
        contextWindow: prefs.contextWindow === 'compaction' ? 'compaction' : 'model',
        textSize: prefs.textSize === 'caption' || prefs.textSize === 'body' ? prefs.textSize : 'footnote',
        logRows: prefs.logRows === 'fill' ? 'fill' : 16,
      }
    }

    function resolvePalette(setup) {
      const base = setup.theme === 'light' ? LIGHT : DARK
      const overrides = setup.colors || {}
      const stationMap = { ...base.stations }
      for (const s of STATIONS) {
        const key = s.id === 'memory' ? 'mem' : `station_${s.id}`
        if (overrides[key]) stationMap[s.id] = overrides[key]
      }
      return { ...base, ...overrides, stations: stationMap }
    }

    // ---- SVG Map Renderer (400x352 Metro Radial Map) ----

    const W = 400
    const H = 352
    const MAP_ASPECT = H / W
    const CX = 200
    const CY = 176
    const RX = 134
    const RY = 122
    const NODE = 18
    const CORE = 34
    const HUB = CORE + 9

    const PULSE_MS = 800
    const RIPPLE_MS = 450
    const GLOW_MS = 3200
    const ALARM_MS = 6000
    const SWITCH_MS = 8000
    const DONE_MS = 1100
    const TRAIL_STOPS = 7
    const TRAIL_HOLD_MS = 40_000
    const TRAIL_FADE_MS = 20_000
    const SHOWN = 40
    const BEND = [0.5, 0.5, 0.4, 0.45, 0.55, 0.75]

    const turnAngle = (i, shift) => ((i + shift) * 2 * Math.PI) / STATIONS.length
    const atAngle = (a, f = 1) => ({ x: CX + RX * f * Math.sin(a), y: CY - RY * f * Math.cos(a) })
    const placeStation = (i, shift) => atAngle(turnAngle(i, shift))
    const indexOfStation = (id) => STATIONS.findIndex((s) => s.id === id)
    const n1 = (v) => (Math.round(v * 10) / 10).toString()
    const clock = (ms) => `${(ms / 1000).toFixed(3)}s`

    function escapeXml(text) {
      return String(text).replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' })[c])
    }

    function edgePoint(from, to, r) {
      const d = Math.hypot(to.x - from.x, to.y - from.y) || 1
      return { x: from.x + ((to.x - from.x) * r) / d, y: from.y + ((to.y - from.y) * r) / d }
    }

    function asideLine(a, b, off) {
      const d = Math.hypot(b.x - a.x, b.y - a.y) || 1
      const dx = (-(b.y - a.y) * off) / d
      const dy = ((b.x - a.x) * off) / d
      return [{ x: a.x + dx, y: a.y + dy }, { x: b.x + dx, y: b.y + dy }]
    }

    function drawPulse(a, b, color, age, radius, isHollow = false, strokeBg = '#0b1320') {
      const path = `M${n1(a.x)} ${n1(a.y)}L${n1(b.x)} ${n1(b.y)}`
      let out = ''
      for (let k = isHollow ? 0 : 2; k >= 0; k--) {
        const timing = `begin="${clock(k * 45 - age)}" dur="${clock(PULSE_MS)}" fill="freeze"`
        const peak = n1(1 - 0.36 * k)
        const paint = isHollow
          ? `fill="none" style="stroke:${color}" stroke-width="1.4"`
          : `style="fill:${color};stroke:${strokeBg}" stroke-width="1.5"`
        out +=
          `<circle r="${n1(radius * (1 - 0.27 * k))}" ${paint} opacity="0">` +
          `<animateMotion path="${path}" ${timing}/>` +
          `<animate attributeName="opacity" values="${peak};${peak};0" keyTimes="0;.82;1" ${timing}/>` +
          '</circle>'
      }
      return out
    }

    function drawRipple(p, r, color, age) {
      const timing = `begin="${clock(PULSE_MS - age)}" dur="${clock(RIPPLE_MS)}" fill="freeze"`
      return (
        `<circle cx="${n1(p.x)}" cy="${n1(p.y)}" r="${r}" fill="none" style="stroke:${color}" stroke-width="1.3" opacity="0">` +
        `<animate attributeName="r" values="${r};${r + 11}" ${timing}/>` +
        `<animate attributeName="opacity" values=".7;0" ${timing}/></circle>`
      )
    }

    function drawBeam(a, b, color, age, isDashed) {
      return (
        `<line x1="${n1(a.x)}" y1="${n1(a.y)}" x2="${n1(b.x)}" y2="${n1(b.y)}" style="stroke:${color}" stroke-width="1.4"${isDashed ? ' stroke-dasharray="3 4"' : ''} opacity="0">` +
        `<animate attributeName="opacity" values=".75;0" begin="${clock(-age)}" dur="${clock(GLOW_MS / 2)}" fill="freeze"/></line>`
      )
    }

    function routeLeg(i, j, shift) {
      const n = STATIONS.length
      let steps = (((j - i) % n) + n) % n
      if (steps > n / 2) steps -= n
      const bend = atAngle(turnAngle(i + steps / 2, shift), BEND[Math.abs(steps)] ?? 0.5)
      const a = edgePoint(placeStation(i, shift), bend, NODE + 5)
      const b = edgePoint(placeStation(j, shift), bend, NODE + 5)
      return { path: `M${n1(a.x)} ${n1(a.y)}Q${n1(bend.x)} ${n1(bend.y)} ${n1(b.x)} ${n1(b.y)}`, end: b }
    }

    function routeOf(entries, max = TRAIL_STOPS) {
      const stops = []
      for (const e of entries) {
        if (e.from === 'agents' || e.station === 'model') continue
        const last = stops[stops.length - 1]
        if (last !== undefined && last.station === e.station) last.at = e.startedAt
        else stops.push({ station: e.station, at: e.startedAt })
      }
      return stops.slice(-max)
    }

    function drawTrail(entries, now, c, isStill, shift) {
      const stops = routeOf(entries)
      const trailColor = `var(--lm-route, ${c.trail})`
      let out = ''
      for (let k = 1; k < stops.length; k++) {
        const from = stops[k - 1]
        const to = stops[k]
        if (!from || !to) continue
        const fi = indexOfStation(from.station)
        const ti = indexOfStation(to.station)
        if (fi < 0 || ti < 0) continue
        const { path, end } = routeLeg(fi, ti, shift)
        const isHead = k === stops.length - 1
        const age = now - to.at
        if (age >= TRAIL_HOLD_MS + TRAIL_FADE_MS) continue
        const opacity = n1(0.16 + (0.5 * k) / Math.max(1, stops.length - 1))
        const fade = `<animate attributeName="opacity" values="${opacity};0" begin="${clock(TRAIL_HOLD_MS - age)}" dur="${clock(TRAIL_FADE_MS)}" fill="freeze"/>`
        const dash = isHead ? '' : ' stroke-dasharray="3 4"'
        const drawing = isHead && !isStill
          ? ` pathLength="1" stroke-dasharray="1 1" stroke-dashoffset="1"><animate attributeName="stroke-dashoffset" values="1;0" begin="${clock(to.at - now)}" dur=".5s" fill="freeze"/>`
          : '>'
        out += `<path d="${path}" fill="none" style="stroke:${trailColor}" stroke-width="${isHead ? 1.6 : 1.1}"${dash} stroke-linecap="round" opacity="${opacity}"${drawing}${fade}</path>`
        if (isHead) {
          out +=
            `<circle cx="${n1(end.x)}" cy="${n1(end.y)}" r="2.6" style="fill:${trailColor}" opacity="${isStill ? '.85' : '0'}">` +
            (isStill ? '' : `<animate attributeName="opacity" values="0;.85" begin="${clock(to.at - now + 400)}" dur=".15s" fill="freeze"/>`) +
            `<animate attributeName="opacity" values=".85;0" begin="${clock(TRAIL_HOLD_MS - age)}" dur="${clock(TRAIL_FADE_MS)}" fill="freeze"/></circle>`
        }
      }
      return out ? `<g data-role="trail">${out}</g>` : ''
    }

    function shownOf(entries) {
      const from = entries.length - SHOWN
      return from <= 0 ? entries : entries.filter((e, i) => i >= from || e.status === 'run')
    }

    function drawStation(s, i, { entries, board, now, c, t, isStill, shift, spent }) {
      const a = turnAngle(i, shift)
      const sinA = Math.sin(a)
      const cosA = Math.cos(a)
      const p = placeStation(i, shift)
      const x = n1(p.x)
      const y = n1(p.y)
      const count = board.counts?.[s.id] ?? 0
      const used = count > 0
      const own = entries.filter((e) => e.station === s.id)
      const running = own.filter((e) => e.status === 'run')
      const latest = own.length > 0 ? own[own.length - 1] : undefined
      const since = latest === undefined ? Infinity : now - (latest.endedAt ?? latest.startedAt)
      const alarm = own.filter((e) => e.status === 'block' || e.status === 'err').pop()
      const alarmAge = alarm === undefined ? Infinity : now - (alarm.endedAt ?? alarm.startedAt)
      const isAlarm = alarmAge < ALARM_MS
      const isLit = running.length > 0 || since < GLOW_MS

      const lineVar = `var(--lm-l-${s.id}, ${c.stations[s.id]})`
      const errVar = `var(--lm-err, ${c.red})`
      const bgVar = `var(--lm-bg, ${c.ground})`
      const surfaceVar = `var(--lm-surface, ${c.raised})`
      const lineBaseVar = `var(--lm-line, ${c.line})`
      const textVar = `var(--lm-text, ${c.bone})`
      const mutedVar = `var(--lm-muted, ${c.ash})`
      const faintVar = `var(--lm-faint, ${c.dim})`

      const color = isAlarm ? errVar : lineVar
      const fade = isAlarm ? alarmAge : since
      const span = isAlarm ? ALARM_MS : GLOW_MS

      let under = ''
      if (isLit || isAlarm) {
        under += running.length > 0 && !isAlarm
          ? `<circle cx="${x}" cy="${y}" r="${NODE + 9}" style="fill:${color}" opacity=".16"/>`
          : `<circle cx="${x}" cy="${y}" r="${NODE + 9}" style="fill:${color}" opacity="0"><animate attributeName="opacity" values=".26;0" begin="${clock(-fade)}" dur="${clock(span)}" fill="freeze"/></circle>`
      }
      if (running.length > 0) {
        const elapsed = Math.max(0, now - Math.min(...running.map((e) => e.startedAt)))
        const beat = `begin="${clock(-(elapsed % 1400))}" dur="1.4s" repeatCount="indefinite"`
        if (!isStill) {
          under +=
            `<circle cx="${x}" cy="${y}" r="${NODE}" fill="none" style="stroke:${color}" stroke-width="1.3">` +
            `<animate attributeName="r" values="${NODE};${NODE + 14}" ${beat}/>` +
            `<animate attributeName="opacity" values=".9;0" ${beat}/></circle>`
        }
        const hand = (r, width, lapMs, isOnce) =>
          `<circle cx="${x}" cy="${y}" r="${r}" fill="none" style="stroke:${lineVar}" stroke-width="${width}" stroke-linecap="round" pathLength="1" stroke-dasharray="1 1" stroke-dashoffset="1" transform="rotate(-90 ${x} ${y})">` +
          `<animate attributeName="stroke-dashoffset" values="1;0" begin="${clock(-(isOnce ? Math.min(elapsed, lapMs) : elapsed % lapMs))}" dur="${clock(lapMs)}" ${isOnce ? 'fill="freeze"' : 'repeatCount="indefinite"'}/></circle>`
        under += hand(NODE + 4.5, 2.4, 60_000, false) + hand(NODE + 8, 1.2, 600_000, true)
      }
      const underGroup = under ? `<g data-station="${s.id}">${under}</g>` : ''

      const fill = isLit ? lineVar : surfaceVar
      const stroke = isAlarm ? errVar : used ? lineVar : lineBaseVar
      const strokeW = used ? 3 : 1.5
      const cooling = !running.length && (isLit || isAlarm)
        ? `<circle cx="${x}" cy="${y}" r="${NODE}" fill="none" style="stroke:${color}" stroke-width="2" opacity="0"><animate attributeName="opacity" values="1;0" begin="${clock(-fade)}" dur="${clock(span)}" fill="freeze"/></circle>`
        : ''
      const glyphColor = isLit ? bgVar : isAlarm ? errVar : used ? textVar : faintVar
      const nameStr = t.stations[s.id] ?? s.id
      const ariaParts = [nameStr]
      if (count > 0) ariaParts.push(t.sessionCount(count))
      if (running.length > 0) ariaParts.push(t.activeCount(running.length))

      let markInner =
        `<circle class="lm-focus-glow" cx="${x}" cy="${y}" r="${NODE + 9}" style="fill:${lineVar}"/>` +
        `<circle cx="${x}" cy="${y}" r="${NODE}" style="fill:${fill};stroke:${stroke}" stroke-width="${strokeW}"/>` +
        cooling +
        `<path transform="translate(${x} ${y})" d="${s.icon}" fill="none" style="stroke:${glyphColor}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>` +
        `<circle class="lm-focus-ring" cx="${x}" cy="${y}" r="${NODE + 6}" fill="none" style="stroke:${textVar}" stroke-width="1.5"/>`

      const corner = NODE * 0.78
      if (running.length > 1) {
        markInner +=
          `<circle cx="${n1(p.x + corner)}" cy="${n1(p.y - corner)}" r="8" style="fill:${surfaceVar};stroke:${lineVar}" stroke-width="1.2"/>` +
          `<text x="${n1(p.x + corner)}" y="${n1(p.y - corner + 3)}" text-anchor="middle" font-family="var(--lm-sans)" font-size="9" font-weight="700" font-variant-numeric="tabular-nums" style="fill:${lineVar}">×${running.length}</text>`
      }
      const faults = board.faults?.[s.id] ?? 0
      if (faults > 0) {
        markInner +=
          `<circle cx="${n1(p.x - corner)}" cy="${n1(p.y - corner)}" r="8" style="fill:${errVar};stroke:${bgVar}" stroke-width="2"/>` +
          `<text x="${n1(p.x - corner)}" y="${n1(p.y - corner + 3.5)}" text-anchor="middle" font-family="var(--lm-sans)" font-size="10" font-weight="700" font-variant-numeric="tabular-nums" style="fill:#ffffff">${faults > 99 ? '99+' : faults}</text>`
      }

      const over = `<g class="lm-st-node" data-station="${s.id}" role="button" tabindex="0" aria-label="${escapeXml(ariaParts.join(' · '))}" aria-pressed="false">${markInner}</g>`

      // External non-overlapping station labels
      const tc = used ? textVar : faintVar
      const nmStyle = `font-family="var(--lm-sans)" font-size="13" font-weight="600" style="fill:${tc}"`
      const ctStyle = `font-family="var(--lm-sans)" font-size="12" font-variant-numeric="tabular-nums" style="fill:${mutedVar}"`
      let countMarkup = ''
      if (used) {
        const pushed = s.id === 'memory' ? Math.min(count, board.pushed ?? 0) : 0
        const asked = count - pushed
        const baseFig = pushed === 0
          ? escapeXml(t.countTimes(count))
          : `${asked > 0 ? `${asked} ` : ''}<tspan style="fill:${lineVar}">↓${pushed}</tspan>`
        const tokens = spent?.[s.id] ?? 0
        const cost = tokens > 0 ? ` · ${formatTokens(tokens)}` : ''
        countMarkup = `${baseFig}${escapeXml(cost)}`
      }

      let labelGroup = ''
      if (Math.abs(sinA) < 0.2) {
        const ly = cosA > 0 ? p.y - NODE - 12 : p.y + NODE + 22
        const cntSpan = countMarkup ? `<tspan dx="6" ${ctStyle}>${countMarkup}</tspan>` : ''
        labelGroup = `<g class="lm-st-label" data-station="${s.id}"><text x="${x}" y="${n1(ly)}" text-anchor="middle"><tspan ${nmStyle}>${escapeXml(nameStr)}</tspan>${cntSpan}</text></g>`
      } else {
        const left = sinA < 0
        const lx = p.x + (left ? -(NODE + 10) : NODE + 10)
        const anc = left ? 'end' : 'start'
        if (countMarkup) {
          labelGroup = `<g class="lm-st-label" data-station="${s.id}"><text x="${n1(lx)}" y="${n1(p.y - 2)}" text-anchor="${anc}" ${nmStyle}>${escapeXml(nameStr)}</text><text x="${n1(lx)}" y="${n1(p.y + 13)}" text-anchor="${anc}" ${ctStyle}>${countMarkup}</text></g>`
        } else {
          labelGroup = `<g class="lm-st-label" data-station="${s.id}"><text x="${n1(lx)}" y="${n1(p.y + 4)}" text-anchor="${anc}" ${nmStyle}>${escapeXml(nameStr)}</text></g>`
        }
      }

      return { under: underGroup, over, label: labelGroup }
    }

    function drawMap(board, now, setup) {
      const c = resolvePalette(setup)
      const shift = setup.layout === 'you-bottom' ? STATIONS.length / 2 : 0
      const core = { x: CX, y: CY }
      const entries = Array.isArray(board.entries) ? board.entries : []
      const recent = shownOf(entries)
      const isStill = setup.motion === 'reduced'
      const flights = isStill ? [] : recent.filter((e) => now - e.startedAt < PULSE_MS + RIPPLE_MS).slice(-14)
      const returns = isStill ? [] : recent.filter((e) => e.endedAt !== undefined && e.from !== 'inbound' && now - e.endedAt < PULSE_MS + RIPPLE_MS).slice(-14)
      const beams = recent.filter((e) => now - e.startedAt < GLOW_MS / 2).slice(-10)
      const anyRunning = recent.some((e) => e.status === 'run')
      const agentsAt = placeStation(indexOfStation('agents'), shift)
      const isBad = (e) => e.status === 'block' || e.status === 'err'

      const bgVar = `var(--lm-bg, ${c.ground})`
      const surfaceVar = `var(--lm-surface, ${c.raised})`
      const raiseVar = `var(--lm-raise, ${c.raise})`
      const lineBaseVar = `var(--lm-line, ${c.line})`
      const textVar = `var(--lm-text, ${c.bone})`
      const mutedVar = `var(--lm-muted, ${c.ash})`
      const errVar = `var(--lm-err, ${c.red})`
      const webVar = `var(--lm-l-web, ${c.stations.web})`
      const modelVar = `var(--lm-l-model, ${c.stations.model})`
      const agentsVar = `var(--lm-l-agents, ${c.stations.agents})`
      const stationVar = (id) => `var(--lm-l-${id}, ${c.stations[id] || c.accent})`

      let body = setup.background === 'transparent'
        ? ''
        : `<rect width="${W}" height="${H}" rx="12" style="fill:${bgVar}"/>`

      for (const r of [70, 108]) {
        const rx = (r * RX / RY) * 0.93
        body += `<ellipse cx="${CX}" cy="${CY}" rx="${n1(rx)}" ry="${r}" fill="none" style="stroke:${lineBaseVar}" stroke-dasharray="1 6" stroke-linecap="round"/>`
      }

      STATIONS.forEach((s, i) => {
        const p = placeStation(i, shift)
        const a = edgePoint(core, p, HUB)
        const b = edgePoint(p, core, NODE + 2)
        const count = board.counts?.[s.id] ?? 0
        const used = count > 0
        const own = recent.filter((e) => e.station === s.id)
        const running = own.some((e) => e.status === 'run')
        const latest = own.length > 0 ? own[own.length - 1] : undefined
        const since = latest === undefined ? Infinity : now - (latest.endedAt ?? latest.startedAt)
        const alarm = own.filter((e) => isBad(e)).pop()
        const isAlarm = alarm !== undefined && (now - (alarm.endedAt ?? alarm.startedAt)) < ALARM_MS
        const isLit = running || since < GLOW_MS
        const w = used ? 2.5 + 4.5 * Math.min(1, Math.log2(1 + count) / 5) : 1.5
        const col = isAlarm ? errVar : used ? stationVar(s.id) : lineBaseVar
        const op = isLit || isAlarm ? 1 : used ? 0.5 : 1
        body += `<g data-station="${s.id}"><line x1="${n1(a.x)}" y1="${n1(a.y)}" x2="${n1(b.x)}" y2="${n1(b.y)}" style="stroke:${col}" stroke-width="${n1(w)}" stroke-linecap="round" opacity="${op}"/></g>`
      })

      const scene = { entries: recent, board, now, c, t: setup.t, isStill, shift, spent: setup.contextCost ? board.spent : undefined }
      const drawn = STATIONS.map((s, i) => drawStation(s, i, scene))
      body += drawn.map((d) => d.under).join('')
      body += drawTrail(entries.slice(-SHOWN), now, c, isStill, shift)

      const ends = (e) => {
        const idx = indexOfStation(e.station)
        const p = placeStation(idx < 0 ? 4 : idx, shift)
        const st = e.from === 'agents' ? agentsAt : core
        return [edgePoint(st, p, e.from === 'agents' ? NODE + 2 : HUB), edgePoint(p, st, NODE + 2)]
      }

      const lane = (list, e) => {
        const peers = list.filter((x) => x.station === e.station && x.from === e.from)
        return (peers.indexOf(e) - (peers.length - 1) / 2) * 5
      }

      const fxByStation = new Map()
      const pushFx = (station, chunk) => {
        fxByStation.set(station, (fxByStation.get(station) || '') + chunk)
      }

      for (const e of beams) {
        const [a, b] = ends(e)
        const col = isBad(e) ? errVar : stationVar(e.station)
        pushFx(e.station, drawBeam(a, b, col, Math.max(0, now - e.startedAt), e.from === 'inbound'))
      }
      for (const e of flights) {
        const [a, b] = asideLine(...ends(e), lane(flights, e))
        const age = Math.max(0, now - e.startedAt)
        const col = e.status === 'block' ? errVar : stationVar(e.station)
        if (e.from === 'inbound') {
          pushFx(e.station, drawPulse(b, a, col, age, 4.2, true, c.ground) + drawRipple(core, HUB - 2, col, age))
        } else {
          const idx = indexOfStation(e.station)
          pushFx(e.station, drawPulse(a, b, col, age, 4.2, false, c.ground) + drawRipple(placeStation(idx < 0 ? 4 : idx, shift), NODE, col, age))
        }
      }
      for (const e of returns) {
        const [a, b] = asideLine(...ends(e), lane(returns, e))
        const col = e.status === 'ok' ? mutedVar : errVar
        pushFx(e.station, drawPulse(b, a, col, Math.max(0, now - e.endedAt), 3.0, false, c.ground))
      }
      for (const [stId, fxHtml] of fxByStation) {
        body += `<g data-station="${stId}">${fxHtml}</g>`
      }

      body += drawn.map((d) => d.over).join('')

      const crew = (board.agents ?? []).slice(0, 6)
      if (crew.length > 0) {
        let crewHtml = ''
        crew.forEach((_, k) => {
          const lap = 7000
          const spin = `${n1(agentsAt.x)} ${n1(agentsAt.y)}`
          if (isStill) {
            crewHtml += `<g transform="rotate(${n1((360 * k) / crew.length)} ${spin})"><circle cx="${n1(agentsAt.x)}" cy="${n1(agentsAt.y - NODE - 10)}" r="3.2" style="fill:${agentsVar}"/></g>`
            return
          }
          crewHtml +=
            `<g><animateTransform attributeName="transform" type="rotate" from="0 ${spin}" to="360 ${spin}" begin="${clock(-((now + (k * lap) / crew.length) % lap))}" dur="${clock(lap)}" repeatCount="indefinite"/>` +
            `<circle cx="${n1(agentsAt.x)}" cy="${n1(agentsAt.y - NODE - 10)}" r="3.2" style="fill:${agentsVar}"/></g>`
        })
        body += `<g data-station="agents">${crewHtml}</g>`
      }

      // Core circle + context ring (model name moved to top meter bar)
      const hasCtx = typeof board.context === 'number' && Number.isFinite(board.context)
      const full = hasCtx ? Math.max(0, Math.min(100, Math.round(board.context))) : 0
      const ctxLen = 2 * Math.PI * (CORE + 6)
      const ctxColor = full >= 90 ? errVar : full >= 70 ? webVar : textVar
      const coreRing =
        `<g data-role="ctx-ring">` +
        `<circle cx="${CX}" cy="${CY}" r="${CORE + 6}" fill="none" style="stroke:${raiseVar}" stroke-width="4"/>` +
        (hasCtx
          ? `<circle cx="${CX}" cy="${CY}" r="${CORE + 6}" fill="none" style="stroke:${ctxColor}" stroke-width="4" stroke-linecap="round" stroke-dasharray="${n1((ctxLen * full) / 100)} ${n1(ctxLen)}" transform="rotate(-90 ${CX} ${CY})"/>`
          : '') +
        `</g>`

      const coreSize = Math.min(18, 56 / (0.75 * Math.max(1, [...setup.core].length)))
      const period = anyRunning ? 1600 : 4800
      const breath = `begin="${clock(-(now % period))}" dur="${clock(period)}" repeatCount="indefinite"`
      const switchAge = board.switchedAt === undefined ? Infinity : now - board.switchedAt
      const isSwitching = switchAge >= 0 && switchAge < SWITCH_MS

      body +=
        coreRing +
        (isStill
          ? `<circle cx="${CX}" cy="${CY}" r="${CORE + 10}" style="fill:${textVar}" opacity="${anyRunning ? '.10' : '.04'}"/>`
          : `<circle cx="${CX}" cy="${CY}" r="${CORE + 8}" style="fill:${textVar}" opacity=".05">` +
            `<animate attributeName="r" values="${CORE + 6};${CORE + 14};${CORE + 6}" ${breath}/>` +
            `<animate attributeName="opacity" values=".03;${anyRunning ? '.14' : '.07'};.03" ${breath}/></circle>`) +
        `<circle cx="${CX}" cy="${CY}" r="${CORE}" style="fill:${surfaceVar};stroke:${isSwitching ? modelVar : anyRunning ? textVar : lineBaseVar}" stroke-width="1.2"/>` +
        `<text x="${CX}" y="${CY + (hasCtx ? 2 : 6)}" text-anchor="middle" font-family="var(--lm-sans)" font-size="${n1(coreSize)}" font-weight="700" letter-spacing="${n1(coreSize * 0.08)}" style="fill:${textVar}">${escapeXml(setup.core)}</text>` +
        (hasCtx
          ? `<text x="${CX}" y="${CY + 18}" text-anchor="middle" font-family="var(--lm-sans)" font-size="12" font-variant-numeric="tabular-nums" style="fill:${mutedVar}">${full}%</text>`
          : '')

      if (isSwitching && !isStill) {
        const modelPt = placeStation(indexOfStation('model'), shift)
        const laps = Math.ceil((SWITCH_MS - switchAge) / 1600)
        for (const [pt, r, stTag] of [[core, CORE, ''], [modelPt, NODE, ' data-station="model"']]) {
          const ringing = `begin="${clock(-(switchAge % 1600))}" dur="1.6s" repeatCount="${laps}" fill="freeze"`
          const ringEl =
            `<circle cx="${n1(pt.x)}" cy="${n1(pt.y)}" r="${r}" fill="none" style="stroke:${modelVar}" stroke-width="1.5" opacity="0">` +
            `<animate attributeName="r" values="${r};${r + 24}" ${ringing}/>` +
            `<animate attributeName="opacity" values=".75;0" ${ringing}/></circle>`
          body += stTag ? `<g${stTag}>${ringEl}</g>` : ringEl
        }
      }

      const done = recent.filter((e) => e.mark === 'done').pop()
      if (done !== undefined && now - done.startedAt < DONE_MS && !isStill) {
        const leaving = `begin="${clock(-Math.max(0, now - done.startedAt))}" dur="${clock(DONE_MS)}" fill="freeze"`
        body +=
          `<circle cx="${CX}" cy="${CY}" r="${CORE}" fill="none" style="stroke:${textVar}" stroke-width="1.6" opacity="0">` +
          `<animate attributeName="r" values="${CORE};${CORE + 34}" ${leaving}/>` +
          `<animate attributeName="opacity" values=".6;0" ${leaving}/></circle>`
      }

      body += drawn.map((d) => d.label).join('')

      const summary = board.model ? `${setup.t.title} · ${shortModel(board.model)}` : setup.t.title
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="${escapeXml(summary)}" style="display:block;height:auto;overflow:visible;"><title>${escapeXml(summary)}</title>${body}</svg>`
    }

    // ---- Feed Folding, Turn Grouping & Now Line ----

    const LIST_ROWS = 16

    function rowOf(e, took) {
      return {
        entry: e,
        times: 1,
        tookMs: took,
        ...(e.tokens !== undefined ? { tokens: e.tokens, ...(e.shared ? { isShared: true } : {}) } : {}),
      }
    }

    function foldInto(row, e, took) {
      row.times++
      row.tookMs += took
      if (e.tokens === undefined && row.tokens === undefined) return
      if (e.tokens === undefined || row.tokens === undefined || e.shared) row.isShared = true
      row.tokens = (row.tokens ?? 0) + (e.tokens ?? 0)
    }

    const isPlain = (e) => e.status === 'ok' && e.mark === undefined

    function foldRows(entries, max = LIST_ROWS, apart = false) {
      const rows = []
      const running = []
      let isCut = false
      const held = Math.max(1, Math.floor(max / 2))
      for (let i = entries.length - 1; i >= 0; i--) {
        const e = entries[i]
        if (!e) continue
        const took = e.endedAt === undefined ? 0 : Math.max(0, e.endedAt - e.startedAt)
        const last = rows[rows.length - 1]
        if (!isCut && last !== undefined && isPlain(e) && isPlain(last.entry) && last.entry.station === e.station && last.entry.from === e.from && (!apart || last.entry.agentId === e.agentId)) {
          foldInto(last, e, took)
          continue
        }
        if (rows.length >= max) {
          isCut = true
          if (e.status !== 'run') continue
          const oldest = running[running.length - 1]
          if (running.length < held || oldest === undefined) running.push({ ...rowOf(e, took), isHeld: true })
          else oldest.times++
          continue
        }
        rows.push(rowOf(e, took))
      }
      return running.length === 0 ? rows : [...rows.slice(0, max - running.length), ...running]
    }

    const isNewMessageEntry = (e) => e && e.station === 'you' && e.from === 'inbound' && e.mark === undefined
    const isTurnEndEntry = (e) => e && (e.mark === 'done' || e.labelKey === 'turnAborted')

    function buildFeedSections(entries, { totalTurns, maxRows = LIST_ROWS, filterStation = null } = {}) {
      const list = Array.isArray(entries) ? entries : []
      const running = []
      const rawGroups = []
      let current = null

      for (const e of list) {
        if (!e) continue
        if (e.status === 'run') {
          if (!filterStation || e.station === filterStation) running.push(e)
          continue
        }
        if (isNewMessageEntry(e)) {
          if (current && current.entries.length > 0) rawGroups.push(current)
          current = { hasUserStart: true, entries: [e] }
          continue
        }
        if (!current) current = { hasUserStart: false, entries: [] }
        current.entries.push(e)
      }
      if (current && current.entries.length > 0) rawGroups.push(current)

      // Order running newest first
      running.reverse()

      const msgTurnCount = rawGroups.reduce((n, g) => n + (g.hasUserStart ? 1 : 0), 0)
      const knownTotal = typeof totalTurns === 'number' && Number.isFinite(totalTurns) ? totalTurns : 0
      let nextTurnNo = Math.max(knownTotal, msgTurnCount)

      const orderedTurns = []
      for (let i = rawGroups.length - 1; i >= 0; i--) {
        const g = rawGroups[i]
        let turnNo = 0
        let isInit = false
        if (g.hasUserStart) {
          turnNo = nextTurnNo
          nextTurnNo--
        } else if (nextTurnNo > 0) {
          turnNo = nextTurnNo
          nextTurnNo--
        } else {
          isInit = true
        }

        const first = g.entries[0]
        const startedAt = first?.startedAt
        let endEntry
        for (let k = g.entries.length - 1; k >= 0; k--) {
          if (isTurnEndEntry(g.entries[k])) {
            endEntry = g.entries[k]
            break
          }
        }
        const durationMs = endEntry && typeof startedAt === 'number' && typeof endEntry.startedAt === 'number' && endEntry.startedAt >= startedAt
          ? endEntry.startedAt - startedAt
          : undefined

        const filtered = filterStation ? g.entries.filter((e) => e.station === filterStation) : g.entries
        if (filtered.length === 0) continue

        orderedTurns.push({
          key: `${isInit ? 'init' : turnNo}-${first?.id ?? i}`,
          turnNo,
          isInit,
          startedAt,
          durationMs,
          rows: foldRows(filtered, Infinity),
        })
      }

      const cap = typeof maxRows === 'number' && Number.isFinite(maxRows) ? Math.max(1, maxRows) : Infinity
      const turns = []
      let remaining = cap
      for (const turn of orderedTurns) {
        if (remaining <= 0) break
        if (turn.rows.length <= remaining) {
          turns.push(turn)
          remaining -= turn.rows.length
        } else {
          turns.push({ ...turn, rows: turn.rows.slice(0, remaining) })
          remaining = 0
        }
      }

      return { running, turns }
    }

    function nowParts(board, t) {
      const entries = Array.isArray(board.entries) ? board.entries : []
      const running = entries.filter((e) => e.status === 'run')
      const top = running[running.length - 1]
      const what = top === undefined
        ? t.idle
        : `${t.stations[top.station] ?? top.station}: ${localizeLabel(top, t)}${running.length > 1 ? t.andMore(running.length - 1) : ''}`
      const figures = [
        typeof board.context === 'number' ? `${Math.round(board.context)}%` : '',
        board.model === undefined || top?.station === 'model' ? '' : shortModel(board.model),
      ]
      return { what, meter: figures.filter(Boolean).join(' · ') }
    }

    // ---- Scoped Styles (DSH Host Typography + Dual Theme Metro Palette) ----

    const FOCUS_CSS = STATIONS.map((s) =>
      `.lm-map-box[data-focus="${s.id}"] [data-station="${s.id}"] { opacity: 1; }\n` +
      `.lm-map-box[data-focus="${s.id}"] [data-station="${s.id}"] .lm-focus-ring { opacity: 1; }\n` +
      `.lm-map-box[data-focus="${s.id}"] [data-station="${s.id}"] .lm-focus-glow { opacity: 0.16; }`
    ).join('\n')

    const CSS_TEXT = `
.lm-pane[data-lm-theme="dark"] {
  --lm-bg: #0b1320;
  --lm-surface: #111c2d;
  --lm-raise: #17243a;
  --lm-line: #22324c;
  --lm-spoke: #22324c;
  --lm-text: #e8edf4;
  --lm-muted: #9aa8bb;
  --lm-faint: #5f7088;
  --lm-ok: #3fbf6f;
  --lm-err: #ff5d5d;
  --lm-err-tint: rgba(255, 93, 93, 0.12);
  --lm-scrim: rgba(5, 9, 16, 0.6);
  --lm-accent: #4c8dff;
  --lm-active: #7fb4ff;
  --lm-route: #e8edf4;
  --lm-l-you: #ffc20e;
  --lm-l-model: #a875f0;
  --lm-l-memory: #1cc2b5;
  --lm-l-files: #4c8dff;
  --lm-l-shell: #4cbb5c;
  --lm-l-web: #ff9a3c;
  --lm-l-browser: #ef72b8;
  --lm-l-agents: #c09272;
  --lm-l-skills: #6cc4f0;
  --lm-l-hooks: #98a4b2;
}
.lm-pane[data-lm-theme="light"] {
  --lm-bg: #f3f4f1;
  --lm-surface: #ffffff;
  --lm-raise: #eceee9;
  --lm-line: #d7dbd3;
  --lm-spoke: #d7dbd3;
  --lm-text: #141a22;
  --lm-muted: #566170;
  --lm-faint: #8d96a1;
  --lm-ok: #23924c;
  --lm-err: #d93636;
  --lm-err-tint: rgba(217, 54, 54, 0.09);
  --lm-scrim: rgba(20, 26, 34, 0.28);
  --lm-accent: #2f6fde;
  --lm-active: #1b5ec7;
  --lm-route: #141a22;
  --lm-l-you: #b88400;
  --lm-l-model: #8247d1;
  --lm-l-memory: #00897f;
  --lm-l-files: #2f6fde;
  --lm-l-shell: #2e8b3d;
  --lm-l-web: #d9730d;
  --lm-l-browser: #c9408c;
  --lm-l-agents: #8a6446;
  --lm-l-skills: #2b8fc4;
  --lm-l-hooks: #7a8592;
}
.lm-pane {
  --lm-sans: var(--dsw-font-family, system-ui, -apple-system, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei UI', sans-serif);
  --lm-mono: var(--ds-font-family-code, 'SF Mono', ui-monospace, Menlo, Consolas, monospace);
  --lm-t-lg: 15px;
  --lm-t-md: 13px;
  --lm-t-sm: 12px;
  --lm-ease: cubic-bezier(0.22, 1, 0.36, 1);
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  flex: 1 1 auto;
  align-self: stretch;
  overflow: hidden;
  box-sizing: border-box;
  font-family: var(--lm-sans);
  font-size: var(--lm-t-md);
  color: var(--lm-text);
  background: var(--dsw-alias-bg-base, transparent);
}
.lm-pane *, .lm-pane *::before, .lm-pane *::after {
  box-sizing: border-box;
}
.lm-pane button {
  font: inherit;
  color: inherit;
}
.lm-pane :focus-visible {
  outline: 2px solid var(--lm-l-files);
  outline-offset: 1px;
}

/* Status bar */
.lm-status {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px 4px;
  flex-shrink: 0;
}
.lm-state {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  flex: 1 1 auto;
}
.lm-state b {
  font-size: var(--lm-t-lg);
  font-weight: 600;
  letter-spacing: -0.01em;
  white-space: nowrap;
}
.lm-state span {
  color: var(--lm-muted);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.lm-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--lm-ok);
  flex-shrink: 0;
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--lm-ok) 22%, transparent);
}
.lm-dot.idle {
  background: var(--lm-faint);
  box-shadow: none;
}
.lm-seg {
  display: inline-flex;
  padding: 2px;
  border-radius: 8px;
  background: var(--lm-raise);
  flex-shrink: 0;
}
.lm-seg button {
  appearance: none;
  border: 0;
  background: none;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: var(--lm-t-sm);
  line-height: 1.3;
  color: var(--lm-muted);
  cursor: pointer;
  white-space: nowrap;
  transition: background-color 160ms var(--lm-ease), color 160ms var(--lm-ease);
}
.lm-seg button[aria-pressed="true"] {
  background: var(--lm-surface);
  color: var(--lm-text);
  font-weight: 600;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.18);
}
.lm-icon-btn {
  appearance: none;
  width: 30px;
  height: 30px;
  border: 0;
  border-radius: 8px;
  background: none;
  color: var(--lm-muted);
  display: inline-grid;
  place-items: center;
  cursor: pointer;
  flex-shrink: 0;
  padding: 0;
  transition: background-color 160ms var(--lm-ease), color 160ms var(--lm-ease);
}
.lm-icon-btn:hover,
.lm-icon-btn[aria-pressed="true"] {
  background: var(--lm-raise);
  color: var(--lm-text);
}

/* Meter row */
.lm-meter {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 4px 14px 8px;
  font-size: var(--lm-t-sm);
  color: var(--lm-muted);
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
  min-width: 0;
}
.lm-ctx {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  flex-shrink: 0;
}
.lm-bar {
  width: 74px;
  height: 5px;
  border-radius: 3px;
  background: var(--lm-raise);
  overflow: hidden;
  display: inline-block;
}
.lm-bar i {
  display: block;
  height: 100%;
  border-radius: 3px;
  background: var(--lm-text);
  transition: width 200ms var(--lm-ease);
}
.lm-bar i.warn { background: var(--lm-l-web); }
.lm-bar i.err { background: var(--lm-err); }
.lm-meter .lm-sep {
  width: 1px;
  height: 12px;
  background: var(--lm-line);
  flex-shrink: 0;
}
.lm-meter b {
  color: var(--lm-text);
  font-weight: 500;
}
.lm-meter-model {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.lm-meter-turn {
  white-space: nowrap;
  flex-shrink: 0;
}

/* Map area & pure-CSS station focus */
.lm-map-wrap {
  position: relative;
  flex-shrink: 0;
  width: 100%;
  padding: 0 12px;
}
.lm-map-box {
  width: 100%;
  max-width: 440px;
  margin: 0 auto;
}
.lm-map-box svg {
  display: block;
  width: 100%;
  height: auto;
  overflow: visible;
}
.lm-map-box text {
  font-family: var(--lm-sans);
}
.lm-map-box [data-station] {
  cursor: pointer;
}
.lm-map-box .lm-focus-ring,
.lm-map-box .lm-focus-glow {
  opacity: 0;
  pointer-events: none;
  transition: opacity 160ms var(--lm-ease);
}
.lm-map-box[data-focus] [data-station],
.lm-map-box[data-focus] [data-role="trail"],
.lm-map-box[data-focus] [data-role="ctx-ring"] {
  opacity: 0.22;
  transition: opacity 160ms var(--lm-ease);
}
${FOCUS_CSS}
.lm-zoom {
  position: absolute;
  right: 12px;
  bottom: 6px;
  display: flex;
  flex-direction: column;
  border-radius: 8px;
  background: var(--lm-surface);
  border: 1px solid var(--lm-line);
  overflow: hidden;
  z-index: 2;
}
.lm-zoom button {
  appearance: none;
  width: 28px;
  height: 26px;
  border: 0;
  background: none;
  color: var(--lm-muted);
  font-size: 15px;
  line-height: 1;
  cursor: pointer;
  padding: 0;
  display: grid;
  place-items: center;
}
.lm-zoom button:hover:not(:disabled) {
  background: var(--lm-raise);
  color: var(--lm-text);
}
.lm-zoom button:disabled {
  opacity: 0.3;
  cursor: default;
}
.lm-zoom button + button {
  border-top: 1px solid var(--lm-line);
}

/* Section & Running cards */
.lm-sect {
  padding: 6px 14px 0;
  flex-shrink: 0;
}
.lm-sect-title {
  margin: 0 0 6px;
  font-size: var(--lm-t-sm);
  font-weight: 600;
  color: var(--lm-muted);
  display: flex;
  align-items: center;
  gap: 8px;
}
.lm-running-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 168px;
  overflow-y: auto;
}
.lm-running-list[data-size="caption"],
.lm-feed[data-size="caption"] {
  --lm-row-sz: 12px;
}
.lm-running-list[data-size="footnote"],
.lm-feed[data-size="footnote"] {
  --lm-row-sz: 13px;
}
.lm-running-list[data-size="body"],
.lm-feed[data-size="body"] {
  --lm-row-sz: 14px;
}
.lm-run {
  position: relative;
  display: grid;
  grid-template-columns: 4px var(--lm-st-col, 3.6em) minmax(0, 1fr) auto;
  align-items: center;
  gap: 0 10px;
  padding: 9px 12px 11px 0;
  background: var(--lm-surface);
  border-radius: 10px;
  overflow: hidden;
  font-size: var(--lm-row-sz, 13px);
}
.lm-run .lm-ln {
  align-self: stretch;
  border-radius: 0 3px 3px 0;
}
.lm-run .lm-st {
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.lm-run .lm-tm {
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  font-size: var(--lm-t-lg);
  white-space: nowrap;
}
.lm-run .lm-prog {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 2px;
  background: var(--lm-raise);
}
.lm-run .lm-prog i {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 34%;
  border-radius: 2px;
  animation: lm-slide 1.6s var(--lm-ease) infinite;
}
.lm-pane[data-lm-motion="reduced"] .lm-run .lm-prog i {
  animation: none;
  transform: translateX(95%);
}
@keyframes lm-slide {
  from { transform: translateX(-100%); }
  to { transform: translateX(300%); }
}

/* Activity feed */
.lm-feed {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 8px 14px 0;
  position: relative;
}
.lm-feed-scroll {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding-bottom: 24px;
}
.lm-feed::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 36px;
  background: linear-gradient(transparent, var(--lm-fade-bg, var(--lm-bg)));
  pointer-events: none;
}
.lm-pane[data-lm-pane-bg="transparent"] .lm-feed::after {
  display: none;
}
.lm-filter {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 6px;
  padding: 7px 10px;
  border-radius: 10px;
  background: var(--lm-surface);
  flex-shrink: 0;
}
.lm-filter .lm-sw {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}
.lm-filter b {
  font-weight: 600;
  white-space: nowrap;
}
.lm-filter span {
  color: var(--lm-muted);
  font-size: var(--lm-t-sm);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.lm-filter button {
  margin-left: auto;
  appearance: none;
  border: 0;
  background: none;
  color: var(--lm-l-files);
  font-size: var(--lm-t-sm);
  font-weight: 500;
  cursor: pointer;
  padding: 0;
  flex-shrink: 0;
}
.lm-turn {
  display: flex;
  align-items: baseline;
  gap: 8px;
  padding: 10px 0 6px;
  border-top: 1px solid var(--lm-line);
}
.lm-turn:first-child {
  border-top: 0;
  padding-top: 2px;
}
.lm-turn b {
  font-size: var(--lm-t-md);
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.lm-turn span {
  margin-left: auto;
  color: var(--lm-faint);
  font-size: var(--lm-t-sm);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.lm-row {
  display: grid;
  grid-template-columns: 3px var(--lm-st-col, 3.6em) minmax(0, 1fr) auto;
  align-items: center;
  gap: 0 10px;
  min-height: 30px;
  padding: 3px 8px 3px 0;
  border-radius: 6px;
  font-size: var(--lm-row-sz, 13px);
  transition: background-color 140ms var(--lm-ease);
}
.lm-row:hover {
  background: var(--lm-surface);
}
.lm-row .lm-ln {
  height: 16px;
  border-radius: 2px;
}
.lm-row .lm-st {
  color: var(--lm-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.lm-lb-wrap {
  display: flex;
  align-items: flex-start;
  gap: 4px;
  min-width: 0;
}
.lm-label {
  flex: 1 1 auto;
  min-width: 0;
  font-family: var(--lm-mono);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.lm-label[data-can-expand="true"] {
  cursor: pointer;
}
.lm-label[data-open="true"] {
  white-space: pre-wrap;
  word-break: break-word;
  overflow: visible;
}
.lm-label small {
  font-family: var(--lm-sans);
  font-size: var(--lm-t-sm);
  color: var(--lm-faint);
  margin-left: 6px;
}
.lm-expand {
  appearance: none;
  border: 0;
  background: transparent;
  color: var(--lm-muted);
  cursor: pointer;
  padding: 0 2px;
  font-family: var(--lm-sans);
  font-size: var(--lm-t-sm);
  line-height: 1.3;
  flex-shrink: 0;
}
.lm-expand:hover {
  color: var(--lm-text);
}
.lm-row .lm-tm {
  color: var(--lm-muted);
  font-variant-numeric: tabular-nums;
  font-size: var(--lm-t-sm);
  white-space: nowrap;
  text-align: right;
}
.lm-row .lm-tm[data-dim="true"] {
  color: var(--lm-faint);
}
.lm-row .lm-tm em {
  font-style: normal;
  color: var(--lm-faint);
  margin-left: 6px;
}
.lm-row.err {
  background: var(--lm-err-tint);
}
.lm-row.err .lm-label,
.lm-row.err .lm-tm {
  color: var(--lm-err);
}
.lm-row.err .lm-ln {
  background: var(--lm-err) !important;
}
.lm-row.swap .lm-label {
  font-family: var(--lm-sans);
  color: var(--lm-l-model);
  font-weight: 500;
}
.lm-row.soft .lm-label {
  font-family: var(--lm-sans);
  color: var(--lm-muted);
}
.lm-empty {
  color: var(--lm-faint);
  font-size: var(--lm-t-sm);
  padding: 8px 2px;
}

/* Bottom settings drawer */
.lm-scrim {
  position: absolute;
  inset: 0;
  background: var(--lm-scrim);
  z-index: 10;
}
.lm-sheet {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  top: 76px;
  max-height: calc(100% - 48px);
  overflow-y: auto;
  background: var(--lm-surface);
  border-radius: 16px 16px 0 0;
  padding: 8px 16px 14px;
  box-shadow: 0 -12px 32px -12px rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  z-index: 11;
}
.lm-grab {
  width: 36px;
  height: 4px;
  border-radius: 2px;
  background: var(--lm-line);
  margin: 0 auto 10px;
  flex-shrink: 0;
}
.lm-sheet header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
}
.lm-sheet header b {
  font-size: var(--lm-t-lg);
  font-weight: 600;
}
.lm-sheet h3 {
  margin: 12px 0 4px;
  font-size: var(--lm-t-sm);
  font-weight: 600;
  color: var(--lm-muted);
}
.lm-opt {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 38px;
  padding: 4px 0;
  border-bottom: 1px solid var(--lm-line);
}
.lm-opt.lm-opt-col {
  flex-direction: column;
  align-items: stretch;
  gap: 6px;
  padding: 6px 0 8px;
}
.lm-opt-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
}
.lm-opt > span,
.lm-opt-row > span {
  white-space: nowrap;
}
.lm-opt .lm-seg {
  background: var(--lm-raise);
}
.lm-opt .lm-seg button[aria-pressed="true"] {
  background: var(--lm-bg);
}
.lm-opt select,
.lm-opt input[type="text"] {
  font-family: var(--lm-sans);
  font-size: var(--lm-t-sm);
  color: var(--lm-text);
  background: var(--lm-bg);
  border: 1px solid var(--lm-line);
  border-radius: 7px;
  padding: 5px 8px;
  width: 126px;
}
.lm-opt input[type="text"].lm-mono-input {
  font-family: var(--lm-mono);
  width: 100%;
}
.lm-opt-trigger {
  appearance: none;
  border: 0;
  background: none;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0;
  cursor: pointer;
  color: inherit;
  text-align: left;
}
.lm-opt .lm-more {
  color: var(--lm-muted);
  font-size: var(--lm-t-sm);
  font-variant-numeric: tabular-nums;
}
.lm-switch {
  appearance: none;
  position: relative;
  width: 36px;
  height: 20px;
  border-radius: 10px;
  background: var(--lm-raise);
  border: 1px solid var(--lm-line);
  flex-shrink: 0;
  cursor: pointer;
  padding: 0;
}
.lm-switch::after {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--lm-muted);
  transition: transform 180ms var(--lm-ease), background-color 180ms var(--lm-ease);
}
.lm-switch[aria-checked="true"] {
  background: var(--lm-l-files);
  border-color: var(--lm-l-files);
}
.lm-switch[aria-checked="true"]::after {
  transform: translateX(16px);
  background: #ffffff;
}
.lm-sheet footer {
  margin-top: auto;
  padding-top: 14px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: var(--lm-t-sm);
  color: var(--lm-faint);
}
.lm-sheet footer button {
  appearance: none;
  border: 0;
  background: none;
  color: var(--lm-muted);
  cursor: pointer;
  padding: 0;
  text-decoration: underline;
  text-underline-offset: 3px;
}
.lm-sheet footer button:hover {
  color: var(--lm-text);
}

/* Header trigger button */
.lm-hdr-btn {
  appearance: none;
  position: relative;
  border: 0;
  background: transparent;
  color: var(--dsw-alias-label-secondary, currentColor);
  width: 28px;
  height: 28px;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 0;
  transition: background-color 120ms ease, color 120ms ease;
}
.lm-hdr-btn:hover {
  background: var(--dsw-alias-bg-layer-2, rgba(128, 128, 128, 0.12));
  color: var(--dsw-alias-label-primary, currentColor);
}
.lm-hdr-btn:focus-visible {
  outline: 2px solid var(--dsw-alias-brand-primary, #4c8dff);
  outline-offset: -2px;
}
.lm-hdr-dot {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #3fbf6f;
  box-shadow: 0 0 0 1.5px var(--dsw-alias-bg-base, #0b1320);
}
.lm-title-icon {
  display: inline-flex;
  align-items: center;
  margin-right: 5px;
  flex-shrink: 0;
}

@media (prefers-reduced-motion: reduce) {
  .lm-run .lm-prog i {
    animation: none;
    transform: translateX(95%);
  }
  .lm-pane * {
    transition: none !important;
  }
}
`

    // ---- Shared Icon Components (pure SVG, zero external imports) ----

    function LotMapGlyph({ size = 16, className }) {
      return h('svg', {
        width: size,
        height: size,
        viewBox: '0 0 24 24',
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: 1.7,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        className,
        'aria-hidden': true,
      },
        h('circle', { cx: 12, cy: 12, r: 3.4 }),
        h('circle', { cx: 12, cy: 3.6, r: 1.4 }),
        h('circle', { cx: 19.3, cy: 7.8, r: 1.4 }),
        h('circle', { cx: 19.3, cy: 16.2, r: 1.4 }),
        h('circle', { cx: 12, cy: 20.4, r: 1.4 }),
        h('circle', { cx: 4.7, cy: 16.2, r: 1.4 }),
        h('circle', { cx: 4.7, cy: 7.8, r: 1.4 }),
        h('line', { x1: 12, y1: 8.6, x2: 12, y2: 5.0 }),
        h('line', { x1: 15.0, y1: 10.3, x2: 18.0, y2: 8.5 }),
        h('line', { x1: 15.0, y1: 13.7, x2: 18.0, y2: 15.5 }),
        h('line', { x1: 12, y1: 15.4, x2: 12, y2: 19.0 }),
        h('line', { x1: 9.0, y1: 13.7, x2: 6.0, y2: 15.5 }),
        h('line', { x1: 9.0, y1: 10.3, x2: 6.0, y2: 8.5 }),
      )
    }

    function GearIcon() {
      return h('svg', {
        width: 17,
        height: 17,
        viewBox: '0 0 24 24',
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: 1.8,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        'aria-hidden': true,
      },
        h('circle', { cx: 12, cy: 12, r: 3 }),
        h('path', { d: 'M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z' }),
      )
    }

    // ---- Decoupled Live Timer Component ----

    function LiveTimer({ sinceMs }) {
      const [, setTick] = useState(0)
      useEffect(() => {
        if (typeof sinceMs !== 'number' || !Number.isFinite(sinceMs)) return undefined
        const id = setInterval(() => setTick((n) => (n + 1) & 0x7fffffff), 1000)
        return () => clearInterval(id)
      }, [sinceMs])
      if (typeof sinceMs !== 'number' || !Number.isFinite(sinceMs)) return null
      return formatClock(Date.now() - sinceMs)
    }

    // ---- Reactive Preferences & Host Environment Store ----

    function createEnvBridge(ctx) {
      const listeners = new Set()
      let prefs = loadPrefs()

      const readThemeScheme = () => {
        try {
          const snap = ctx.get?.('theme')?.getTheme?.()
          if (snap?.active?.colorScheme === 'light' || snap?.active?.colorScheme === 'dark') {
            return snap.active.colorScheme
          }
        } catch { /* fallback below */ }
        if (typeof document !== 'undefined') {
          const body = document.body
          const root = document.documentElement
          if (body?.hasAttribute('data-ds-dark-theme') || root?.hasAttribute('data-ds-dark-theme')) {
            return 'dark'
          }
          if (typeof getComputedStyle === 'function' && body) {
            const m = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)/.exec(getComputedStyle(body).backgroundColor || '')
            if (m && (m[4] === undefined || Number(m[4]) > 0.1)) {
              const lum = 0.2126 * Number(m[1]) + 0.7152 * Number(m[2]) + 0.0722 * Number(m[3])
              return lum > 140 ? 'light' : 'dark'
            }
          }
        }
        return 'dark'
      }

      const readLocale = () => {
        try {
          const loc = ctx.get?.('locale')
          const cur = typeof loc?.getLocale === 'function'
            ? loc.getLocale()
            : (typeof loc?.locale === 'string' ? loc.locale : undefined)
          if (cur) return cur
        } catch { /* fallback below */ }
        if (typeof navigator !== 'undefined' && navigator.language) return navigator.language
        return 'en'
      }

      let state = { prefs, scheme: readThemeScheme(), hostLang: readLocale() }
      const emit = () => {
        for (const fn of listeners) {
          try { fn() } catch { /* isolate subscriber */ }
        }
      }

      return {
        getSnapshot: () => state,
        subscribe: (fn) => {
          listeners.add(fn)
          return () => { listeners.delete(fn) }
        },
        updatePrefs: (patch) => {
          prefs = { ...prefs, ...patch }
          savePrefs(prefs)
          state = { ...state, prefs }
          emit()
        },
        resetPrefs: () => {
          prefs = { ...DEFAULT_PREFS }
          savePrefs(prefs)
          state = { ...state, prefs }
          emit()
        },
        syncHost: () => {
          const scheme = readThemeScheme()
          const hostLang = readLocale()
          if (scheme !== state.scheme || hostLang !== state.hostLang) {
            state = { ...state, scheme, hostLang }
            emit()
          }
        },
      }
    }

    function useEnv(bridge) {
      const [, setTick] = useState(0)
      useEffect(() => bridge.subscribe(() => setTick((n) => n + 1)), [bridge])
      return bridge.getSnapshot()
    }

    // ---- Main Lot Map Sidebar Tab Body ----

    function createLotMapBody(bridge) {
      return function LotMapBody(props) {
        const { useProjection, sessionId } = props
        const env = useEnv(bridge)
        const setup = useMemo(
          () => resolveSetup(env.prefs, env.scheme, env.hostLang),
          [env.prefs, env.scheme, env.hostLang],
        )
        const { t } = setup

        const rawBoard = useProjection ? useProjection('lotMap') : undefined
        const pressure = useProjection ? useProjection('contextPressure') : undefined

        const board = useMemo(() => {
          const base = rawBoard && typeof rawBoard === 'object'
            ? rawBoard
            : { entries: [], counts: {} }
          let context = setup.contextWindow === 'compaction' && typeof base.compactContext === 'number'
            ? base.compactContext
            : base.context
          if (pressure && typeof pressure === 'object' && typeof pressure.contextWindow === 'number' && pressure.contextWindow > 0) {
            const tokens = typeof pressure.projectedTokens === 'number'
              ? pressure.projectedTokens
              : (typeof pressure.pressureTokens === 'number' ? pressure.pressureTokens : undefined)
            const compactRaw = setup.contextWindow === 'compaction'
              ? (pressure.autoCompactWindow ?? pressure.compactionWindow ?? pressure.compactThreshold ?? pressure.thresholdTokens)
              : undefined
            const denom = typeof compactRaw === 'number' && Number.isFinite(compactRaw) && compactRaw > 0 && compactRaw < pressure.contextWindow
              ? compactRaw
              : pressure.contextWindow
            if (tokens !== undefined) {
              context = Math.min(100, Math.round((tokens / denom) * 100))
            }
          }
          return context === base.context ? base : { ...base, context }
        }, [rawBoard, pressure, setup.contextWindow])

        const [openRowId, setOpenRowId] = useState(null)
        const [showSettings, setShowSettings] = useState(false)
        const [selectedStation, setSelectedStation] = useState(null)
        const [showColorEditor, setShowColorEditor] = useState(false)
        const [customBgDraft, setCustomBgDraft] = useState(() =>
          setup.paneBackground.startsWith('#') ? setup.paneBackground : '',
        )
        const [truncatedIds, setTruncatedIds] = useState(() => new Set())
        const paneRef = useRef(null)
        const mapBoxRef = useRef(null)

        useEffect(() => {
          setSelectedStation(null)
          setOpenRowId(null)
        }, [sessionId])

        useEffect(() => {
          if (setup.paneBackground.startsWith('#')) setCustomBgDraft(setup.paneBackground)
        }, [setup.paneBackground])

        // Escape closes drawer first, then clears station filter
        useEffect(() => {
          if ((!showSettings && selectedStation === null) || typeof document === 'undefined') return undefined
          const onKey = (e) => {
            if (e.key !== 'Escape') return
            if (showSettings) setShowSettings(false)
            else if (selectedStation !== null) setSelectedStation(null)
          }
          document.addEventListener('keydown', onKey)
          return () => document.removeEventListener('keydown', onKey)
        }, [showSettings, selectedStation])

        // SVG memoized purely on [board, setup] — never rebuilt by station clicks or 1s LiveTimer ticks
        const svgHtml = useMemo(() => {
          let now = Date.now()
          if (typeof board.switchedAt === 'number' && Number.isFinite(board.switchedAt) && board.switchedAt > now) {
            now = board.switchedAt
          }
          for (const e of board.entries || []) {
            if (typeof e.startedAt === 'number' && Number.isFinite(e.startedAt) && e.startedAt > now) now = e.startedAt
            if (typeof e.endedAt === 'number' && Number.isFinite(e.endedAt) && e.endedAt > now) now = e.endedAt
          }
          return drawMap(board, now, setup)
        }, [board, setup])

        // Sync aria-pressed on station buttons without touching SVG DOM structure
        useEffect(() => {
          const box = mapBoxRef.current
          if (!box || typeof box.querySelectorAll !== 'function') return
          for (const el of box.querySelectorAll('[role="button"][data-station]')) {
            const id = el.getAttribute('data-station')
            el.setAttribute('aria-pressed', id === selectedStation ? 'true' : 'false')
          }
        }, [selectedStation, svgHtml])

        const onMapClick = useCallback((e) => {
          const target = e.target?.closest?.('[data-station]')
          const id = target?.getAttribute?.('data-station')
          if (!id) return
          setSelectedStation((prev) => (prev === id ? null : id))
        }, [])

        const onMapKeyDown = useCallback((e) => {
          if (e.key !== 'Enter' && e.key !== ' ') return
          const target = e.target?.closest?.('[data-station]')
          const id = target?.getAttribute?.('data-station')
          if (!id) return
          e.preventDefault()
          setSelectedStation((prev) => (prev === id ? null : id))
        }, [])

        const entries = Array.isArray(board.entries) ? board.entries : []
        const sections = useMemo(() => buildFeedSections(entries, {
          totalTurns: board.turns,
          maxRows: setup.logRows === 'fill' ? Infinity : LIST_ROWS,
          filterStation: selectedStation,
        }), [entries, board.turns, setup.logRows, selectedStation])

        const allRunning = useMemo(() => entries.filter((e) => e.status === 'run'), [entries])
        const isRunning = allRunning.length > 0

        const { activeTurnStartMs, lastTurnMs } = useMemo(() => {
          let lastNewMsgAt
          let completedMs
          for (const x of entries) {
            if (isNewMessageEntry(x)) lastNewMsgAt = x.startedAt
            if (isTurnEndEntry(x) && lastNewMsgAt !== undefined && x.startedAt >= lastNewMsgAt) {
              completedMs = x.startedAt - lastNewMsgAt
            }
          }
          const fallbackRunAt = allRunning.length > 0
            ? Math.min(...allRunning.map((e) => e.startedAt))
            : undefined
          return {
            activeTurnStartMs: lastNewMsgAt ?? fallbackRunAt,
            lastTurnMs: completedMs,
          }
        }, [entries, allRunning])

        // Real DOM overflow measurement for both running cards and historical rows
        useEffect(() => {
          const root = paneRef.current
          if (!root || typeof root.querySelectorAll !== 'function') return undefined
          const measure = () => {
            const next = new Set()
            for (const el of root.querySelectorAll('[data-row-id]')) {
              const id = el.getAttribute('data-row-id')
              const label = el.querySelector('.lm-label')
              if (id && label && label.scrollWidth > label.clientWidth + 1) next.add(id)
            }
            setTruncatedIds((prev) => {
              if (prev.size === next.size) {
                let same = true
                for (const id of next) if (!prev.has(id)) { same = false; break }
                if (same) return prev
              }
              return next
            })
          }
          measure()
          if (typeof ResizeObserver === 'undefined') return undefined
          const ro = new ResizeObserver(measure)
          ro.observe(root)
          return () => ro.disconnect()
        }, [sections, setup.textSize, openRowId])

        const stationColCh = useMemo(() => {
          const maxLen = Math.max(4, ...Object.values(t.stations).map((s) => {
            let w = 0
            for (const ch of s) w += /[\u2e80-\uffff]/.test(ch) ? 2 : 1
            return w
          }))
          return `${(maxLen * 0.52 + 0.5).toFixed(2)}em`
        }, [t.stations])

        const minimized = env.prefs.minimized === true
        const zoom = typeof env.prefs.zoom === 'number' && ZOOMS.includes(env.prefs.zoom) ? env.prefs.zoom : null
        const pal = useMemo(() => resolvePalette(setup), [setup])

        const stepZoom = useCallback((dir) => {
          const idx = zoom === null ? ZOOMS.length : ZOOMS.indexOf(zoom)
          const nextIdx = Math.min(ZOOMS.length, Math.max(0, (idx < 0 ? ZOOMS.length : idx) + dir))
          bridge.updatePrefs({ zoom: nextIdx >= ZOOMS.length ? null : ZOOMS[nextIdx] })
        }, [zoom])

        const stationColorVar = (id) => `var(--lm-l-${id}, ${pal.stations[id] || pal.accent})`

        const renderRunningCard = (entry) => {
          const textLabel = localizeLabel(entry, t)
          const isOpen = openRowId === entry.id
          const isTruncated = truncatedIds.has(entry.id)
          const canExpand = isTruncated || isOpen
          const toggleRow = () => setOpenRowId(isOpen ? null : entry.id)
          const stCol = stationColorVar(entry.station)

          return h('div', {
            key: entry.id,
            className: 'lm-run',
            'data-row-id': entry.id,
          },
            h('i', { className: 'lm-ln', style: { background: stCol }, 'aria-hidden': true }),
            h('span', { className: 'lm-st' }, t.stations[entry.station] ?? entry.station),
            h('div', { className: 'lm-lb-wrap' },
              h('span', {
                className: 'lm-label',
                'data-open': isOpen ? 'true' : 'false',
                'data-can-expand': canExpand ? 'true' : undefined,
                title: canExpand && !isOpen ? textLabel : undefined,
                onClick: canExpand ? toggleRow : undefined,
              }, textLabel),
              canExpand ? h('button', {
                type: 'button',
                className: 'lm-expand',
                title: isOpen ? t.collapseRow : t.expandRow,
                'aria-label': isOpen ? t.collapseRow : t.expandRow,
                'aria-expanded': isOpen,
                onClick: toggleRow,
              }, isOpen ? '▾' : '▸') : null,
            ),
            h('span', { className: 'lm-tm' }, h(LiveTimer, { sinceMs: entry.startedAt })),
            h('span', { className: 'lm-prog', 'aria-hidden': true },
              h('i', { style: { background: stCol } }),
            ),
          )
        }

        const renderFeedRow = (row) => {
          const { entry, times, tookMs, tokens, isShared } = row
          const isErr = entry.status === 'err' || entry.status === 'block'
          const isSwitch = entry.mark === 'switch'
          const isSoft = entry.labelKey === 'newMessage'
            || entry.labelKey === 'answerReady'
            || entry.labelKey === 'addedContextToMessage'
            || entry.labelKey === 'addedContextAtStart'
            || entry.labelKey === 'addedMemoryToMessage'
            || entry.labelKey === 'addedMemoryAtStart'
          const rowKind = isErr ? ' err' : isSwitch ? ' swap' : isSoft ? ' soft' : ''
          const prefix = isErr ? '✕ ' : isSwitch ? '◆ ' : ''
          const textLabel = localizeLabel(entry, t)
          const fullTitle = `${prefix}${textLabel}${times > 1 ? ` ×${times}` : ''}`
          const took = entry.endedAt === undefined
            ? t.running
            : tookMs > 0
              ? formatMs(tookMs, t)
              : '—'
          const isMoment = took === '—'
          const cost = setup.contextCost && tokens !== undefined
            ? `${isShared ? '~' : ''}+${formatTokens(tokens)}`
            : ''
          const isOpen = openRowId === entry.id
          const isTruncated = truncatedIds.has(entry.id)
          const canExpand = isTruncated || isOpen
          const toggleRow = () => setOpenRowId(isOpen ? null : entry.id)

          return h('div', {
            key: entry.id,
            className: `lm-row${rowKind}`,
            'data-row-id': entry.id,
          },
            h('i', { className: 'lm-ln', style: { background: stationColorVar(entry.station) }, 'aria-hidden': true }),
            h('span', { className: 'lm-st' }, t.stations[entry.station] ?? entry.station),
            h('div', { className: 'lm-lb-wrap' },
              h('span', {
                className: 'lm-label',
                'data-open': isOpen ? 'true' : 'false',
                'data-can-expand': canExpand ? 'true' : undefined,
                title: canExpand && !isOpen ? fullTitle : undefined,
                onClick: canExpand ? toggleRow : undefined,
              },
                prefix,
                textLabel,
                times > 1 ? h('small', null, `×${times}`) : null,
              ),
              canExpand ? h('button', {
                type: 'button',
                className: 'lm-expand',
                title: isOpen ? t.collapseRow : t.expandRow,
                'aria-label': isOpen ? t.collapseRow : t.expandRow,
                'aria-expanded': isOpen,
                onClick: toggleRow,
              }, isOpen ? '▾' : '▸') : null,
            ),
            h('span', { className: 'lm-tm', 'data-dim': isMoment ? 'true' : 'false' },
              took,
              cost ? h('em', null, cost) : null,
            ),
          )
        }

        const renderSeg = (items, currentVal, onPick) => h('div', { className: 'lm-seg', role: 'group' },
          items.map(([val, label]) => h('button', {
            key: String(val),
            type: 'button',
            'aria-pressed': currentVal === val,
            onClick: () => onPick(val),
          }, label)),
        )

        const renderSwitch = (checked, label, onToggle) => h('button', {
          type: 'button',
          role: 'switch',
          'aria-checked': checked,
          'aria-label': label,
          className: 'lm-switch',
          onClick: () => onToggle(!checked),
        })

        const paneBgSelectVal = setup.paneBackground.startsWith('#') ? 'custom' : setup.paneBackground
        const colorOverrideCount = Object.keys(setup.colors).length

        const settingsDrawer = showSettings ? h(React.Fragment, null,
          h('div', { className: 'lm-scrim', onClick: () => setShowSettings(false), 'aria-hidden': true }),
          h('div', { className: 'lm-sheet', role: 'dialog', 'aria-modal': 'true', 'aria-label': t.settings },
            h('div', { className: 'lm-grab', 'aria-hidden': true }),
            h('header', null,
              h('b', null, t.settings),
              h('button', {
                type: 'button',
                className: 'lm-icon-btn',
                title: t.close,
                'aria-label': t.close,
                onClick: () => setShowSettings(false),
              }, '✕'),
            ),

            h('h3', null, t.grpAppearance),
            h('div', { className: 'lm-opt' },
              h('span', null, t.opt.theme),
              renderSeg([['auto', t.opt.auto], ['dark', t.opt.dark], ['light', t.opt.light]], env.prefs.theme, (v) => bridge.updatePrefs({ theme: v })),
            ),
            h('div', { className: 'lm-opt' },
              h('span', null, t.opt.layout),
              renderSeg([['you-top', t.opt.youTop], ['you-bottom', t.opt.youBottom]], env.prefs.layout, (v) => bridge.updatePrefs({ layout: v })),
            ),
            h('div', { className: 'lm-opt' },
              h('span', null, t.opt.background),
              renderSeg([['solid', t.opt.solid], ['transparent', t.opt.transparent]], env.prefs.background, (v) => bridge.updatePrefs({ background: v })),
            ),
            h('div', { className: `lm-opt${paneBgSelectVal === 'custom' ? ' lm-opt-col' : ''}` },
              h('div', { className: 'lm-opt-row' },
                h('span', null, t.opt.paneBackground),
                h('select', {
                  'aria-label': t.opt.paneBackground,
                  value: paneBgSelectVal,
                  onChange: (e) => {
                    const v = e.target.value
                    if (v === 'custom') {
                      const seed = setup.paneBackground.startsWith('#') ? setup.paneBackground : pal.ground
                      setCustomBgDraft(seed)
                      bridge.updatePrefs({ paneBackground: seed })
                    } else {
                      bridge.updatePrefs({ paneBackground: v })
                    }
                  },
                },
                  h('option', { value: 'theme' }, t.opt.paneTheme),
                  h('option', { value: 'solid' }, t.opt.paneSolid),
                  h('option', { value: 'transparent' }, t.opt.transparent),
                  h('option', { value: 'custom' }, t.opt.paneCustom),
                ),
              ),
              paneBgSelectVal === 'custom' ? h('input', {
                type: 'text',
                className: 'lm-mono-input',
                maxLength: 7,
                'aria-label': t.opt.paneCustom,
                value: customBgDraft,
                placeholder: pal.ground,
                onChange: (e) => {
                  const raw = e.target.value
                  setCustomBgDraft(raw)
                  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(raw.trim())) {
                    bridge.updatePrefs({ paneBackground: raw.trim().toLowerCase() })
                  }
                },
              }) : null,
            ),

            h('h3', null, t.grpMap),
            h('div', { className: 'lm-opt' },
              h('span', null, t.opt.motion),
              renderSeg([['full', t.opt.full], ['reduced', t.opt.reduced]], env.prefs.motion, (v) => bridge.updatePrefs({ motion: v })),
            ),
            h('div', { className: 'lm-opt' },
              h('span', null, t.opt.contextWindow),
              renderSeg([['model', t.opt.cwModel], ['compaction', t.opt.cwCompaction]], env.prefs.contextWindow || 'model', (v) => bridge.updatePrefs({ contextWindow: v })),
            ),
            h('div', { className: 'lm-opt' },
              h('span', null, t.opt.coreName),
              h('input', {
                type: 'text',
                maxLength: 10,
                'aria-label': t.opt.coreName,
                value: env.prefs.coreName,
                placeholder: 'DSH',
                onChange: (e) => bridge.updatePrefs({ coreName: e.target.value }),
              }),
            ),

            h('h3', null, t.grpFeed),
            h('div', { className: 'lm-opt' },
              h('span', null, t.opt.textSize),
              renderSeg([['caption', t.opt.caption], ['footnote', t.opt.footnote], ['body', t.opt.body]], env.prefs.textSize, (v) => bridge.updatePrefs({ textSize: v })),
            ),
            h('div', { className: 'lm-opt' },
              h('span', null, t.opt.logRows),
              renderSeg([[16, t.rows16], ['fill', t.opt.fill]], env.prefs.logRows === 'fill' ? 'fill' : 16, (v) => bridge.updatePrefs({ logRows: v })),
            ),
            h('div', { className: 'lm-opt' },
              h('span', null, t.opt.contextCost),
              renderSwitch(env.prefs.contextCost === true, t.opt.contextCost, (checked) => bridge.updatePrefs({ contextCost: checked })),
            ),

            h('h3', null, t.grpGeneral),
            h('div', { className: 'lm-opt' },
              h('span', null, t.opt.language),
              h('select', {
                'aria-label': t.opt.language,
                value: env.prefs.language,
                onChange: (e) => bridge.updatePrefs({ language: e.target.value }),
              },
                h('option', { value: 'auto' }, t.opt.auto),
                h('option', { value: 'zh' }, '中文'),
                h('option', { value: 'en' }, 'English'),
              ),
            ),
            h('div', { className: 'lm-opt' },
              h('span', null, t.opt.openAtStart),
              renderSwitch(env.prefs.openAtStart === true, t.opt.openAtStart, (checked) => bridge.updatePrefs({ openAtStart: checked })),
            ),
            h('div', { className: `lm-opt${showColorEditor ? ' lm-opt-col' : ''}` },
              h('button', {
                type: 'button',
                className: 'lm-opt-trigger',
                'aria-expanded': showColorEditor,
                onClick: () => setShowColorEditor((v) => !v),
              },
                h('span', null, t.opt.colors),
                h('span', { className: 'lm-more' }, `${colorOverrideCount > 0 ? t.configuredColors(colorOverrideCount) : t.notSet} ${showColorEditor ? '▾' : '›'}`),
              ),
              showColorEditor ? h('input', {
                type: 'text',
                className: 'lm-mono-input',
                'aria-label': t.opt.colors,
                value: env.prefs.colors || '',
                placeholder: 'files=#4c8dff,background=#0b1320',
                onChange: (e) => bridge.updatePrefs({ colors: e.target.value }),
              }) : null,
            ),

            h('footer', null,
              h('span', null, t.settingsHint),
              h('button', { type: 'button', onClick: () => bridge.resetPrefs() }, t.reset),
            ),
          ),
        ) : null

        const paneStyle = { '--lm-st-col': stationColCh }
        const ov = setup.colors
        if (ov.ground) paneStyle['--lm-bg'] = ov.ground
        if (ov.raised) paneStyle['--lm-surface'] = ov.raised
        if (ov.line) paneStyle['--lm-line'] = ov.line
        if (ov.spoke) paneStyle['--lm-spoke'] = ov.spoke
        if (ov.bone) paneStyle['--lm-text'] = ov.bone
        if (ov.ash) paneStyle['--lm-muted'] = ov.ash
        if (ov.dim) paneStyle['--lm-faint'] = ov.dim
        if (ov.red) paneStyle['--lm-err'] = ov.red
        if (ov.mem) paneStyle['--lm-l-memory'] = ov.mem
        if (ov.trail) paneStyle['--lm-route'] = ov.trail
        if (ov.accent) paneStyle['--lm-accent'] = ov.accent
        for (const s of STATIONS) {
          if (s.id !== 'memory' && ov[`station_${s.id}`]) {
            paneStyle[`--lm-l-${s.id}`] = ov[`station_${s.id}`]
          }
        }

        if (setup.paneBackground === 'transparent') {
          paneStyle.background = 'transparent'
        } else if (setup.paneBackground === 'solid') {
          paneStyle.background = pal.ground
          paneStyle.color = pal.bone
          paneStyle.colorScheme = setup.theme
          paneStyle['--lm-fade-bg'] = pal.ground
        } else if (setup.paneBackground.startsWith('#')) {
          paneStyle.background = setup.paneBackground
          paneStyle['--lm-bg'] = setup.paneBackground
          paneStyle['--lm-fade-bg'] = setup.paneBackground
          paneStyle.color = pal.bone
          paneStyle.colorScheme = setup.theme
        } else {
          paneStyle['--lm-fade-bg'] = 'var(--dsw-alias-bg-base, var(--lm-bg))'
          if (ov.bone) paneStyle.color = ov.bone
        }

        const hasCtx = typeof board.context === 'number' && Number.isFinite(board.context)
        const ctxPct = hasCtx ? Math.max(0, Math.min(100, Math.round(board.context))) : 0
        const ctxBarClass = ctxPct >= 90 ? 'err' : ctxPct >= 70 ? 'warn' : undefined

        const statusSubtitle = isRunning
          ? t.activeCount(allRunning.length)
          : lastTurnMs !== undefined && lastTurnMs > 0
            ? t.lastTurnDuration(formatMs(lastTurnMs, t))
            : entries.length === 0
              ? t.nothingYet
              : ''

        return h('div', {
          ref: paneRef,
          className: 'lm-pane',
          'data-lm-theme': setup.theme,
          'data-lm-bg': setup.background,
          'data-lm-pane-bg': setup.paneBackground === 'transparent' ? 'transparent' : 'solid',
          'data-lm-motion': setup.motion,
          style: paneStyle,
        },
          // 1. Status bar
          h('div', { className: 'lm-status' },
            h('div', { className: 'lm-state' },
              h('i', { className: `lm-dot${isRunning ? '' : ' idle'}`, 'aria-hidden': true }),
              h('b', null, isRunning ? t.statusRunning : t.statusIdle),
              statusSubtitle ? h('span', null, statusSubtitle) : null,
            ),
            h('div', { className: 'lm-seg', role: 'group', 'aria-label': t.viewMode },
              h('button', {
                type: 'button',
                'aria-pressed': !minimized,
                onClick: () => bridge.updatePrefs({ minimized: false }),
              }, t.viewMap),
              h('button', {
                type: 'button',
                'aria-pressed': minimized,
                onClick: () => bridge.updatePrefs({ minimized: true }),
              }, t.viewList),
            ),
            h('button', {
              type: 'button',
              className: 'lm-icon-btn',
              title: t.settings,
              'aria-label': t.settings,
              'aria-pressed': showSettings,
              onClick: () => setShowSettings((v) => !v),
            }, h(GearIcon)),
          ),

          // 2. Meter row
          h('div', { className: 'lm-meter' },
            h('span', { className: 'lm-ctx' },
              h('span', null, t.contextLabel),
              h('span', { className: 'lm-bar', 'aria-hidden': true },
                h('i', { className: ctxBarClass, style: { width: `${ctxPct}%` } }),
              ),
              h('b', null, hasCtx ? `${ctxPct}%` : '--'),
            ),
            board.model ? h(React.Fragment, null,
              h('i', { className: 'lm-sep', 'aria-hidden': true }),
              h('b', { className: 'lm-meter-model', title: board.model }, shortModel(board.model)),
            ) : null,
            isRunning && activeTurnStartMs !== undefined ? h(React.Fragment, null,
              h('i', { className: 'lm-sep', 'aria-hidden': true }),
              h('span', { className: 'lm-meter-turn' },
                t.thisTurn, ' ',
                h('b', null, h(LiveTimer, { sinceMs: activeTurnStartMs })),
              ),
            ) : null,
          ),

          // 3. Radial work map
          !minimized ? h('div', { className: 'lm-map-wrap' },
            h('div', {
              ref: mapBoxRef,
              className: 'lm-map-box',
              'data-focus': selectedStation || undefined,
              style: zoom !== null ? { width: `${zoom}px`, maxWidth: '100%' } : undefined,
              onClick: onMapClick,
              onKeyDown: onMapKeyDown,
              dangerouslySetInnerHTML: { __html: svgHtml },
            }),
            h('div', { className: 'lm-zoom' },
              h('button', {
                type: 'button',
                title: t.zoomIn,
                'aria-label': t.zoomIn,
                disabled: zoom === null,
                onClick: () => stepZoom(1),
              }, '+'),
              h('button', {
                type: 'button',
                title: t.zoomOut,
                'aria-label': t.zoomOut,
                disabled: zoom === ZOOMS[0],
                onClick: () => stepZoom(-1),
              }, '−'),
            ),
          ) : null,

          // 4. Running cards section
          sections.running.length > 0 ? h('section', { className: 'lm-sect' },
            h('h2', { className: 'lm-sect-title' }, t.runningSection),
            h('div', { className: 'lm-running-list', 'data-size': setup.textSize },
              sections.running.map(renderRunningCard),
            ),
          ) : null,

          // 5. Recent activity feed (grouped by turn)
          h('div', { className: 'lm-feed', 'data-size': setup.textSize },
            h('h2', { className: 'lm-sect-title' }, t.recentSection),
            selectedStation ? h('div', { className: 'lm-filter' },
              h('i', { className: 'lm-sw', style: { background: stationColorVar(selectedStation) }, 'aria-hidden': true }),
              h('b', null, t.filterOnly(t.stations[selectedStation] ?? selectedStation)),
              h('span', null,
                t.sessionCount(board.counts?.[selectedStation] ?? 0),
                setup.contextCost && (board.spent?.[selectedStation] ?? 0) > 0 ? ` · ${formatTokens(board.spent[selectedStation])}` : '',
              ),
              h('button', { type: 'button', onClick: () => setSelectedStation(null) }, t.clearFilter),
            ) : null,
            h('div', { className: 'lm-feed-scroll' },
              sections.turns.length === 0
                ? (sections.running.length === 0
                    ? h('div', { className: 'lm-empty' }, selectedStation ? t.stationEmpty : t.nothingYet)
                    : null)
                : sections.turns.map((turn) => {
                    const hm = formatHm(turn.startedAt)
                    const dur = turn.durationMs !== undefined && turn.durationMs > 0 ? formatMs(turn.durationMs, t) : ''
                    const meta = [hm, dur].filter(Boolean).join(' · ')
                    return h(React.Fragment, { key: turn.key },
                      h('div', { className: 'lm-turn' },
                        h('b', null, turn.isInit ? t.initTurn : t.turnTitle(turn.turnNo)),
                        meta ? h('span', null, meta) : null,
                      ),
                      turn.rows.map(renderFeedRow),
                    )
                  }),
            ),
          ),

          // 6. Settings drawer
          settingsDrawer,
        )
      }
    }

    // ---- Tab Title Component ----

    function createLotMapTitle(bridge) {
      return function LotMapTitle() {
        const env = useEnv(bridge)
        const setup = resolveSetup(env.prefs, env.scheme, env.hostLang)
        return h(React.Fragment, null,
          h('span', { className: 'lm-title-icon' }, h(LotMapGlyph, { size: 15 })),
          setup.t.title,
        )
      }
    }

    // ---- Header Button + Auto-open & /lot-map Open-Signal Observer ----

    function loadOpenedSet() {
      try {
        const raw = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(OPENED_KEY) : null
        const parsed = raw ? JSON.parse(raw) : []
        return new Set(Array.isArray(parsed) ? parsed : [])
      } catch {
        return new Set()
      }
    }

    function saveOpenedSet(set) {
      try {
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.setItem(OPENED_KEY, JSON.stringify([...set].slice(-40)))
        }
      } catch { /* ignore storage errors */ }
    }

    const AUTO_OPEN_STALE_MS = 15_000

    function classifyAutoOpen(board, now = Date.now()) {
      if (!board || typeof board !== 'object') return 'wait'
      const entries = Array.isArray(board.entries) ? board.entries : []
      if (entries.length === 0) return 'wait'
      const isRunning = entries.some((e) => e.status === 'run')
      const hasDone = entries.some((e) => e.mark === 'done' || e.labelKey === 'turnAborted')
      const turns = typeof board.turns === 'number'
        ? board.turns
        : entries.filter((e) => e.station === 'you' && e.from === 'inbound' && e.mark === undefined).length
      if (turns > 1) return 'skip'
      if (hasDone && !isRunning) return 'skip'
      if (turns === 0 && entries.length > 6) return 'skip'
      let latestAt = 0
      for (const e of entries) {
        const ts = typeof e.endedAt === 'number' ? e.endedAt : (typeof e.startedAt === 'number' ? e.startedAt : 0)
        if (ts > latestAt) latestAt = ts
      }
      if (!isRunning && latestAt > 0 && now - latestAt > AUTO_OPEN_STALE_MS) return 'skip'
      return 'open'
    }

    function createHeaderTrigger(ctx, bridge) {
      const autoOpenedSessions = loadOpenedSet()
      const handledCommandSeq = new Map()

      return function LotMapHeaderButton(props) {
        const { sessionId, useProjection } = props
        const env = useEnv(bridge)
        const setup = resolveSetup(env.prefs, env.scheme, env.hostLang)
        const board = useProjection ? useProjection('lotMap') : undefined
        const entries = Array.isArray(board?.entries) ? board.entries : []
        const isRunning = entries.some((e) => e.status === 'run')
        const openReq = typeof board?.openRequestSeq === 'number' ? board.openRequestSeq : 0
        const autoOpenAction = env.prefs.openAtStart === true && sessionId && !autoOpenedSessions.has(sessionId)
          ? classifyAutoOpen(board)
          : 'idle'

        // Handle `/lot-map` slash command trigger from session log
        useEffect(() => {
          if (!sessionId) return
          const prev = handledCommandSeq.get(sessionId)
          if (prev === undefined) {
            handledCommandSeq.set(sessionId, openReq)
            return
          }
          if (openReq > prev) {
            handledCommandSeq.set(sessionId, openReq)
            try {
              ctx.sidebarRight?.openTabIn?.(sessionId, TAB_KIND)
            } catch { /* ignore if surface not ready */ }
          }
        }, [sessionId, openReq])

        // Handle `openAtStart` option: open as soon as the first message arrives in a fresh session
        useEffect(() => {
          if (!sessionId || autoOpenAction === 'idle' || autoOpenAction === 'wait') return
          if (autoOpenedSessions.has(sessionId)) return
          if (autoOpenAction === 'skip') {
            autoOpenedSessions.add(sessionId)
            saveOpenedSet(autoOpenedSessions)
            return
          }

          // ponytail: retries openTabIn up to 10×100ms in case RightbarSeat has not adopted sessionId yet;
          // upgrade to a sidebarRight.mounted/openTabs subscription if host adoption latency ever exceeds 1s.
          let cancelled = false
          let attempts = 0
          let timer = null

          const isTabOpened = () => {
            const openTabs = ctx.sidebarRight?.openTabs?.getSnapshot?.()
            if (!Array.isArray(openTabs)) return true
            return openTabs.some((row) => row?.sessionId === sessionId && row?.kind === TAB_KIND)
          }

          const tryOpen = () => {
            if (cancelled || autoOpenedSessions.has(sessionId)) return
            attempts += 1
            try {
              ctx.sidebarRight?.openTabIn?.(sessionId, TAB_KIND)
            } catch { /* retry if surface not ready yet */ }

            if (isTabOpened()) {
              autoOpenedSessions.add(sessionId)
              saveOpenedSet(autoOpenedSessions)
              return
            }
            if (attempts < 10) {
              timer = setTimeout(tryOpen, 100)
            }
          }

          tryOpen()
          return () => {
            cancelled = true
            if (timer !== null) clearTimeout(timer)
          }
        }, [sessionId, autoOpenAction])

        const onClick = useCallback(() => {
          if (!sessionId) return
          try {
            ctx.sidebarRight?.openTabIn?.(sessionId, TAB_KIND)
          } catch {
            try { ctx.sidebarRight?.openTab?.(TAB_KIND) } catch { /* noop */ }
          }
        }, [sessionId])

        return h('button', {
          type: 'button',
          className: 'lm-hdr-btn',
          title: `${setup.t.title} (Alt+Shift+M)`,
          'aria-label': setup.t.title,
          'data-lot-map-trigger': 'true',
          onClick,
        },
          h(LotMapGlyph, { size: 16 }),
          isRunning ? h('span', { className: 'lm-hdr-dot', 'aria-hidden': true }) : null,
        )
      }
    }

    // ---- Cordis Client Plugin Definition ----

    return {
      inject: ['slots', 'sidebarRightTabs', 'sidebarRight'],
      apply(ctx) {
        const bridge = createEnvBridge(ctx)

        // Inject component stylesheet with proper teardown
        ctx.effect(() => {
          if (typeof document === 'undefined' || !document.head) return undefined
          let el = document.getElementById(STYLE_ID)
          const created = !el
          if (!el) {
            el = document.createElement('style')
            el.id = STYLE_ID
            document.head.appendChild(el)
          }
          el.textContent = CSS_TEXT
          return () => {
            if (created && el.parentNode) el.parentNode.removeChild(el)
          }
        }, 'lot-map: styles')

        // Sync with DSH theme & locale changes
        ctx.inject(['theme'], (scope) => {
          bridge.syncHost()
          scope.on('theme/change', () => bridge.syncHost())
        })
        ctx.inject(['locale'], (scope) => {
          bridge.syncHost()
          scope.on('locale/change', () => bridge.syncHost())
        })
        ctx.on('theme/change', () => bridge.syncHost())
        ctx.on('locale/change', () => bridge.syncHost())
        ctx.effect(() => {
          bridge.syncHost()
          if (typeof MutationObserver === 'undefined' || typeof document === 'undefined' || !document.body) return undefined
          const mo = new MutationObserver(() => bridge.syncHost())
          mo.observe(document.body, { attributes: true, attributeFilter: ['data-ds-dark-theme'] })
          if (document.documentElement) {
            mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-ds-dark-theme'] })
          }
          return () => mo.disconnect()
        }, 'lot-map: theme observer')

        // Register keyboard shortcut Alt+Shift+M if shortcuts service exists
        ctx.inject(['shortcuts'], (scope) => {
          scope.effect(() => scope.shortcuts.register({
            id: 'lot-map.open',
            label: () => resolveSetup(bridge.getSnapshot().prefs, bridge.getSnapshot().scheme, bridge.getSnapshot().hostLang).t.title,
            aliases: ['lot map', 'work map', 'lot-map'],
            defaults: {
              'desktop:macos': { code: 'KeyM', modifiers: ['alt', 'shift'] },
              'desktop:windows': { code: 'KeyM', modifiers: ['alt', 'shift'] },
              'desktop:linux': { code: 'KeyM', modifiers: ['alt', 'shift'] },
              'web:macos': { code: 'KeyM', modifiers: ['alt', 'shift'] },
              'web:windows': { code: 'KeyM', modifiers: ['alt', 'shift'] },
              'web:linux': { code: 'KeyM', modifiers: ['alt', 'shift'] },
            },
            regions: ['page', 'editable', 'terminal'],
            modals: [],
            resolve: ({ target: element }) => {
              const target = scope.sidebarRight.commandTarget(element)
              if (target === undefined) return { status: 'blocked', reason: 'No active session' }
              return { status: 'handled', run: () => { scope.sidebarRight.openTabFromTarget(TAB_KIND, target) } }
            },
          }), 'lot-map: shortcut')
        })

        const getStrings = () => {
          const snap = bridge.getSnapshot()
          return resolveSetup(snap.prefs, snap.scheme, snap.hostLang).t
        }

        // Stage 1: Register Right Sidebar tab type + Guide entry
        ctx.effect(() => ctx.sidebarRightTabs.register({
          id: TAB_ID,
          kind: TAB_KIND,
          priority: 'extension',
          keepMounted: true,
          title: () => getStrings().title,
          guide: [{
            id: 'lot-map',
            commandId: 'lot-map.open',
            order: 45,
            title: () => getStrings().title,
            description: () => getStrings().guideDesc,
            icon: LotMapGlyph,
          }],
        }), 'lot-map: tab type')

        // Stage 2: Register Right Sidebar tab body & tab chip title
        const LotMapBody = createLotMapBody(bridge)
        const LotMapTitle = createLotMapTitle(bridge)
        ctx.effect(() => ctx.slots.inject('sidebar.right.pane.tab', () => ctx.slots.register(
          { name: 'sidebar.right.pane.tab', key: TAB_ID },
          LotMapBody,
        )), 'lot-map: tab body')

        ctx.effect(() => ctx.slots.inject('sidebar.right.pane.tab.title', () => ctx.slots.register(
          { name: 'sidebar.right.pane.tab.title', key: TAB_ID },
          LotMapTitle,
        )), 'lot-map: tab title')

        // Quick trigger button in the conversation header utilities
        const LotMapHeaderButton = createHeaderTrigger(ctx, bridge)
        ctx.effect(() => ctx.slots.inject('conversation.session.header.utilities', () => ctx.slots.register(
          { name: 'conversation.session.header.utilities', id: 'lot-map-trigger', order: 45 },
          LotMapHeaderButton,
        )), 'lot-map: header button')
      },
      // Pure internals exported for unit verification only; Cordis ignores extra keys.
      _internals: {
        DARK,
        LIGHT,
        COLOR_NAMES,
        STATIONS,
        STRINGS,
        CSS_TEXT,
        MAP_ASPECT,
        drawMap,
        foldRows,
        buildFeedSections,
        nowParts,
        routeOf,
        formatMs,
        formatClock,
        formatTokens,
        shortModel,
        resolveSetup,
        resolvePalette,
        parseColors,
        parsePaneBackground,
        localizeLabel,
        LiveTimer,
        classifyAutoOpen,
      },
    }
  },
})
