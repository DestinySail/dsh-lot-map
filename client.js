// Browser UI entry for @local/dsh-lot-map.
// 1:1 faithful port of alexeyw/lot-map's radial work map + activity feed for DeepSeek Harness.
window.__ModuleLoader__.load({
  id: '@local/dsh-lot-map',
  factory(require) {
    'use strict'
    const React = require('react')
    const h = React.createElement
    const { useState, useEffect, useMemo, useRef, useCallback } = React

    const TAB_ID = '@local/dsh-lot-map'
    const TAB_KIND = 'lot-map'
    const STORAGE_KEY = 'dsh.lot-map.settings.v1'
    const OPENED_KEY = 'dsh.lot-map.opened.v1'
    const STYLE_ID = 'dsh-lot-map-styles'

    // ---- Palette (1:1 from alexeyw/lot-map/hooks/palette.ts) ----

    const DARK = {
      ground: '#0a0c11',
      raised: '#12151c',
      line: '#272c36',
      spoke: '#1a1e27',
      bone: '#ebe6dc',
      ash: '#9ba1ab',
      dim: '#6b7280',
      accent: '#e1ac6e',
      hot: '#f0c595',
      red: '#e8654f',
      mem: '#62c7ba',
      memHot: '#a5e6dc',
      trail: '#ebe6dd',
    }

    const LIGHT = {
      ground: '#f5f2ea',
      raised: '#ffffff',
      line: '#cfc9bc',
      spoke: '#e3ded2',
      bone: '#1f2228',
      ash: '#5f6570',
      dim: '#8b909a',
      accent: '#b8762a',
      hot: '#8f560f',
      red: '#c5402b',
      mem: '#1c8c81',
      memHot: '#136a62',
      trail: '#9c978b',
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

    // ---- Stations & exact SVG icon paths (1:1 from alexeyw/lot-map/hooks/setup.ts) ----

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

    // ---- Strings (2 languages: en + zh) ----

    const STRINGS = {
      en: {
        title: 'Work map',
        guideDesc: 'Live map of tool calls, model steps, memory, skills, and subagents',
        zoomOut: 'Zoom out',
        zoomIn: 'Zoom in',
        hideMap: 'Hide map',
        showMap: 'Show map',
        settings: 'Options',
        reset: 'Reset defaults',
        expandRow: 'Expand full label',
        collapseRow: 'Collapse label',
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
          colors: 'Custom colors (name=#rrggbb)',
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
        reset: '恢复默认',
        expandRow: '展开完整标签',
        collapseRow: '收起标签',
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
          motion: '动效', full: '完整', reduced: '减弱', contextCost: '上下文增量估算',
          contextWindow: '上下文环基准', cwModel: '模型窗口', cwCompaction: '压缩阈值',
          textSize: '字号', caption: '小', footnote: '默认', body: '大',
          logRows: '日志行数', fill: '填满', openAtStart: '新会话自动打开',
          colors: '自定义配色 (name=#rrggbb)',
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
        const key = COLOR_NAMES[pair.slice(0, at).trim()]
        const hex = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.exec(pair.slice(at + 1).trim())?.[0]?.toLowerCase()
        if (!key || !hex) continue
        out[key] = hex.length === 4 ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}` : hex
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

    // ---- SVG Map Renderer (1:1 port of alexeyw/lot-map/hooks/draw.ts) ----

    const W = 460
    const H = 430
    const MAP_ASPECT = H / W
    const CX = 230
    const CY = 212
    const RX = 176
    const RY = 164
    const NODE = 22
    const CORE = 40
    const HUB = CORE + 8
    const FONT = 'font-family="SF Mono, ui-monospace, Menlo, Consolas, monospace"'

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

    function drawPulse(a, b, color, age, radius, isHollow = false) {
      const path = `M${n1(a.x)} ${n1(a.y)}L${n1(b.x)} ${n1(b.y)}`
      let out = ''
      for (let k = isHollow ? 0 : 2; k >= 0; k--) {
        const timing = `begin="${clock(k * 45 - age)}" dur="${clock(PULSE_MS)}" fill="freeze"`
        const peak = n1(1 - 0.36 * k)
        const paint = isHollow ? `fill="none" stroke="${color}" stroke-width="1.4"` : `fill="${color}"`
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
        `<circle cx="${n1(p.x)}" cy="${n1(p.y)}" r="${r}" fill="none" stroke="${color}" stroke-width="1.2" opacity="0">` +
        `<animate attributeName="r" values="${r};${r + 11}" ${timing}/>` +
        `<animate attributeName="opacity" values=".7;0" ${timing}/></circle>`
      )
    }

    function drawBeam(a, b, color, age, isDashed) {
      return (
        `<line x1="${n1(a.x)}" y1="${n1(a.y)}" x2="${n1(b.x)}" y2="${n1(b.y)}" stroke="${color}" stroke-width="1.4"${isDashed ? ' stroke-dasharray="3 4"' : ''} opacity="0">` +
        `<animate attributeName="opacity" values=".75;0" begin="${clock(-age)}" dur="${clock(GLOW_MS / 2)}" fill="freeze"/></line>`
      )
    }

    function routeLeg(i, j, shift) {
      const n = STATIONS.length
      let steps = (((j - i) % n) + n) % n
      if (steps > n / 2) steps -= n
      const bend = atAngle(turnAngle(i + steps / 2, shift), BEND[Math.abs(steps)] ?? 0.5)
      const a = edgePoint(placeStation(i, shift), bend, NODE + 4)
      const b = edgePoint(placeStation(j, shift), bend, NODE + 4)
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
        const opacity = n1(0.12 + (0.5 * k) / (stops.length - 1))
        const fade = `<animate attributeName="opacity" values="${opacity};0" begin="${clock(TRAIL_HOLD_MS - age)}" dur="${clock(TRAIL_FADE_MS)}" fill="freeze"/>`
        const drawing = isHead && !isStill
          ? ` pathLength="1" stroke-dasharray="1 1" stroke-dashoffset="1"><animate attributeName="stroke-dashoffset" values="1;0" begin="${clock(to.at - now)}" dur=".5s" fill="freeze"/>`
          : '>'
        out += `<path d="${path}" fill="none" stroke="${c.trail}" stroke-width="${isHead ? 1.5 : 1.1}" stroke-linecap="round" opacity="${opacity}"${drawing}${fade}</path>`
        if (isHead) {
          out +=
            `<circle cx="${n1(end.x)}" cy="${n1(end.y)}" r="2.4" fill="${c.trail}" opacity="${isStill ? '.85' : '0'}">` +
            (isStill ? '' : `<animate attributeName="opacity" values="0;.85" begin="${clock(to.at - now + 400)}" dur=".15s" fill="freeze"/>`) +
            `<animate attributeName="opacity" values=".85;0" begin="${clock(TRAIL_HOLD_MS - age)}" dur="${clock(TRAIL_FADE_MS)}" fill="freeze"/></circle>`
        }
      }
      return out
    }

    function shownOf(entries) {
      const from = entries.length - SHOWN
      return from <= 0 ? entries : entries.filter((e, i) => i >= from || e.status === 'run')
    }

    function drawStation(s, i, { entries, board, now, c, names, isStill, shift, spent, rimStroke, useRim }) {
      const p = placeStation(i, shift)
      const x = n1(p.x)
      const y = n1(p.y)
      const count = board.counts?.[s.id] ?? 0
      const own = entries.filter((e) => e.station === s.id)
      const running = own.filter((e) => e.status === 'run')
      const latest = own.length > 0 ? own[own.length - 1] : undefined
      const since = latest === undefined ? Infinity : now - (latest.endedAt ?? latest.startedAt)
      const alarm = own.filter((e) => e.status === 'block' || e.status === 'err').pop()
      const alarmAge = alarm === undefined ? Infinity : now - (alarm.endedAt ?? alarm.startedAt)
      const isAlarm = alarmAge < ALARM_MS
      const isLit = running.length > 0 || since < GLOW_MS
      const [main, hot] = s.id === 'memory' ? [c.mem, c.memHot] : [c.accent, c.hot]
      const color = isAlarm ? c.red : main
      const fade = isAlarm ? alarmAge : since
      const span = isAlarm ? ALARM_MS : GLOW_MS

      let under = ''
      if (isLit || isAlarm) {
        under += running.length > 0 && !isAlarm
          ? `<circle cx="${x}" cy="${y}" r="${NODE + 10}" fill="${color}" opacity=".16"/>`
          : `<circle cx="${x}" cy="${y}" r="${NODE + 10}" fill="${color}" opacity="0"><animate attributeName="opacity" values=".3;0" begin="${clock(-fade)}" dur="${clock(span)}" fill="freeze"/></circle>`
      }
      if (running.length > 0) {
        const elapsed = Math.max(0, now - Math.min(...running.map((e) => e.startedAt)))
        const beat = `begin="${clock(-(elapsed % 1400))}" dur="1.4s" repeatCount="indefinite"`
        if (!isStill) {
          under +=
            `<circle cx="${x}" cy="${y}" r="${NODE}" fill="none" stroke="${color}" stroke-width="1.3">` +
            `<animate attributeName="r" values="${NODE};${NODE + 15}" ${beat}/>` +
            `<animate attributeName="opacity" values=".9;0" ${beat}/></circle>`
        }
        const hand = (r, width, lapMs, isOnce) =>
          `<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="${hot}" stroke-width="${width}" pathLength="1" stroke-dasharray="1 1" stroke-dashoffset="1" transform="rotate(-90 ${x} ${y})">` +
          `<animate attributeName="stroke-dashoffset" values="1;0" begin="${clock(-(isOnce ? Math.min(elapsed, lapMs) : elapsed % lapMs))}" dur="${clock(lapMs)}" ${isOnce ? 'fill="freeze"' : 'repeatCount="indefinite"'}/></circle>`
        under += hand(NODE + 4, 2.2, 60_000, false) + hand(NODE + 8, 1.2, 600_000, true)
      }

      const lit = `<circle cx="${x}" cy="${y}" r="${NODE}" fill="none" stroke="${color}" stroke-width="1.2"`
      const cooling = running.length > 0
        ? `${lit}/>`
        : isLit || isAlarm
          ? `${lit} opacity="0"><animate attributeName="opacity" values="1;0" begin="${clock(-fade)}" dur="${clock(span)}" fill="freeze"/></circle>`
          : ''
      const glyphColor = isAlarm ? c.red : isLit ? hot : s.id === 'memory' && count > 0 ? main : c.ash
      const rim = useRim ? `paint-order="stroke" stroke="${rimStroke}" stroke-width="3.5" stroke-linejoin="round"` : ''
      let over =
        `<circle cx="${x}" cy="${y}" r="${NODE}" fill="${c.raised}" stroke="${c.line}" stroke-width="1.2"/>${cooling}` +
        `<path transform="translate(${x} ${y})" d="${s.icon}" fill="none" stroke="${glyphColor}" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/>` +
        `<text x="${x}" y="${n1(p.y + NODE + 15)}" text-anchor="middle" ${FONT} font-size="11.5"${rim ? ` ${rim}` : ''} fill="${isLit || isAlarm ? c.bone : c.ash}">${escapeXml(names[s.id])}</text>`

      if (count > 0) {
        const pushed = s.id === 'memory' ? Math.min(count, board.pushed ?? 0) : 0
        const asked = count - pushed
        const figures = pushed === 0
          ? String(count)
          : `${asked > 0 ? `${asked} ` : ''}<tspan fill="${main}">↓${pushed}</tspan>`
        const tokens = spent?.[s.id] ?? 0
        const cost = tokens > 0 ? ` · ${formatTokens(tokens)}` : ''
        over += `<text x="${x}" y="${n1(p.y + NODE + 28)}" text-anchor="middle" ${FONT} font-size="9.5"${rim ? ` ${rim}` : ''} fill="${c.dim}">${figures}${cost}</text>`
      }

      const corner = NODE * 0.74
      if (running.length > 1) {
        over +=
          `<circle cx="${n1(p.x + corner)}" cy="${n1(p.y - corner)}" r="8" fill="${c.raised}" stroke="${color}" stroke-width="1"/>` +
          `<text x="${n1(p.x + corner)}" y="${n1(p.y - corner + 3)}" text-anchor="middle" ${FONT} font-size="8.5" fill="${hot}">×${running.length}</text>`
      }
      const faults = board.faults?.[s.id] ?? 0
      if (faults > 0) {
        over +=
          `<circle cx="${n1(p.x - corner)}" cy="${n1(p.y - corner)}" r="7.5" fill="${c.red}"/>` +
          `<text x="${n1(p.x - corner)}" y="${n1(p.y - corner + 3.1)}" text-anchor="middle" ${FONT} font-size="9" font-weight="700" fill="${c.ground}">${faults > 99 ? '99+' : faults}</text>`
      }
      return { under, over }
    }

    function drawMap(board, now, setup) {
      const c = { ...(setup.theme === 'light' ? LIGHT : DARK), ...setup.colors }
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
      const tone = (e) => (e.station === 'memory' ? [c.mem, c.memHot] : [c.accent, c.hot])

      const hasCustomBg = typeof setup.paneBackground === 'string' && setup.paneBackground.startsWith('#')
      const rimStroke = setup.background === 'transparent' && hasCustomBg ? setup.paneBackground : c.ground
      const useRim = setup.background !== 'transparent' || hasCustomBg

      let body = setup.background === 'transparent' ? '' : `<rect width="${W}" height="${H}" rx="12" fill="${c.ground}"/>`

      for (const [rx, ry] of [[66, 62], [104, 97], [142, 132]]) {
        body += `<ellipse cx="${CX}" cy="${CY}" rx="${rx}" ry="${ry}" fill="none" stroke="${c.line}" stroke-width=".7" opacity=".45" stroke-dasharray="2 5"/>`
      }

      STATIONS.forEach((s, i) => {
        const p = placeStation(i, shift)
        const a = edgePoint(core, p, HUB)
        const b = edgePoint(p, core, NODE)
        const worn = Math.min(1, Math.log2(1 + (board.counts?.[s.id] ?? 0)) / 7)
        const line = `<line x1="${n1(a.x)}" y1="${n1(a.y)}" x2="${n1(b.x)}" y2="${n1(b.y)}" stroke-width="${n1(1 + 2.6 * worn)}" stroke-linecap="round"`
        body += `${line} stroke="${c.spoke}"/>`
        if (worn > 0) body += `${line} stroke="${s.id === 'memory' ? c.mem : c.accent}" opacity="${n1(worn * 0.55)}"/>`
      })

      const scene = { entries: recent, board, now, c, names: setup.t.stations, isStill, shift, spent: setup.contextCost ? board.spent : undefined, rimStroke, useRim }
      const drawn = STATIONS.map((s, i) => drawStation(s, i, scene))
      body += drawn.map((d) => d.under).join('')
      body += drawTrail(entries.slice(-SHOWN), now, c, isStill, shift)

      const ends = (e) => {
        const idx = indexOfStation(e.station)
        const p = placeStation(idx < 0 ? 4 : idx, shift)
        const st = e.from === 'agents' ? agentsAt : core
        return [edgePoint(st, p, e.from === 'agents' ? NODE : HUB), edgePoint(p, st, NODE)]
      }

      const lane = (list, e) => {
        const peers = list.filter((x) => x.station === e.station && x.from === e.from)
        return (peers.indexOf(e) - (peers.length - 1) / 2) * 5
      }

      for (const e of beams) {
        const [a, b] = ends(e)
        body += drawBeam(a, b, isBad(e) ? c.red : tone(e)[0], Math.max(0, now - e.startedAt), e.from === 'inbound')
      }
      for (const e of flights) {
        const [a, b] = asideLine(...ends(e), lane(flights, e))
        const age = Math.max(0, now - e.startedAt)
        const color = e.status === 'block' ? c.red : tone(e)[1]
        if (e.from === 'inbound') {
          body += drawPulse(b, a, color, age, 3.8, true) + drawRipple(core, HUB - 2, color, age)
        } else {
          const idx = indexOfStation(e.station)
          body += drawPulse(a, b, color, age, 3.8) + drawRipple(placeStation(idx < 0 ? 4 : idx, shift), NODE, color, age)
        }
      }
      for (const e of returns) {
        const [a, b] = asideLine(...ends(e), lane(returns, e))
        body += drawPulse(b, a, e.status === 'ok' ? c.ash : c.red, Math.max(0, now - e.endedAt), 2.6)
      }

      body += drawn.map((d) => d.over).join('')

      const crew = (board.agents ?? []).slice(0, 6)
      crew.forEach((_, k) => {
        const lap = 7000
        const spin = `${n1(agentsAt.x)} ${n1(agentsAt.y)}`
        if (isStill) {
          body += `<g transform="rotate(${n1((360 * k) / crew.length)} ${spin})"><circle cx="${n1(agentsAt.x)}" cy="${n1(agentsAt.y - NODE - 6)}" r="3" fill="${c.hot}"/></g>`
          return
        }
        body +=
          `<g><animateTransform attributeName="transform" type="rotate" from="0 ${spin}" to="360 ${spin}" begin="${clock(-((now + (k * lap) / crew.length) % lap))}" dur="${clock(lap)}" repeatCount="indefinite"/>` +
          `<circle cx="${n1(agentsAt.x)}" cy="${n1(agentsAt.y - NODE - 6)}" r="3" fill="${c.hot}"/></g>`
      })

      const coreSize = Math.min(17, 62 / (0.75 * Math.max(1, [...setup.core].length)))
      const period = anyRunning ? 1600 : 4800
      const breath = `begin="${clock(-(now % period))}" dur="${clock(period)}" repeatCount="indefinite"`
      body +=
        (isStill
          ? `<circle cx="${CX}" cy="${CY}" r="${CORE + 8}" fill="${c.accent}" opacity="${anyRunning ? '.16' : '.08'}"/>`
          : `<circle cx="${CX}" cy="${CY}" r="${CORE + 6}" fill="${c.accent}" opacity=".08">` +
            `<animate attributeName="r" values="${CORE + 3};${CORE + 13};${CORE + 3}" ${breath}/>` +
            `<animate attributeName="opacity" values=".05;${anyRunning ? '.24' : '.12'};.05" ${breath}/></circle>`) +
        `<circle cx="${CX}" cy="${CY}" r="${CORE}" fill="${c.raised}" stroke="${anyRunning ? c.accent : c.line}" stroke-width="1.3"/>`

      if (typeof board.context === 'number' && Number.isFinite(board.context)) {
        const full = Math.max(0, Math.min(100, Math.round(board.context)))
        const ring = `cx="${CX}" cy="${CY}" r="${CORE + 5}" fill="none" stroke-width="2.2"`
        body +=
          `<circle ${ring} stroke="${c.line}" opacity=".7"/>` +
          `<circle ${ring} stroke="${full >= 90 ? c.red : full >= 70 ? c.accent : c.ash}" pathLength="100" stroke-dasharray="${full} 100" transform="rotate(-90 ${CX} ${CY})"/>` +
          `<text x="${CX}" y="${CY - 19}" text-anchor="middle" ${FONT} font-size="8" fill="${c.dim}">${full}%</text>`
      }

      const switchAge = board.switchedAt === undefined ? Infinity : now - board.switchedAt
      const isSwitching = switchAge >= 0 && switchAge < SWITCH_MS
      body += `<text x="${CX}" y="${CY + (board.model === undefined ? 6 : 1)}" text-anchor="middle" ${FONT} font-size="${n1(coreSize)}" letter-spacing="${n1(coreSize * 0.147)}" fill="${c.bone}">${escapeXml(setup.core)}</text>`
      if (board.model !== undefined) {
        const sm = shortModel(board.model)
        const modelFontSize = sm.length > 17 ? 6.4 : sm.length > 14 ? 7.2 : sm.length > 11 ? 8.2 : 9
        body += `<text x="${CX}" y="${CY + 16}" text-anchor="middle" ${FONT} font-size="${modelFontSize}" fill="${isSwitching ? c.hot : c.ash}">${escapeXml(sm)}</text>`
      }

      if (isSwitching && !isStill) {
        const modelPt = placeStation(indexOfStation('model'), shift)
        const laps = Math.ceil((SWITCH_MS - switchAge) / 1600)
        for (const [p, r] of [[core, CORE], [modelPt, NODE]]) {
          const ringing = `begin="${clock(-(switchAge % 1600))}" dur="1.6s" repeatCount="${laps}" fill="freeze"`
          body +=
            `<circle cx="${n1(p.x)}" cy="${n1(p.y)}" r="${r}" fill="none" stroke="${c.bone}" stroke-width="1.4" opacity="0">` +
            `<animate attributeName="r" values="${r};${r + 26}" ${ringing}/>` +
            `<animate attributeName="opacity" values=".7;0" ${ringing}/></circle>`
        }
      }

      const done = recent.filter((e) => e.mark === 'done').pop()
      if (done !== undefined && now - done.startedAt < DONE_MS && !isStill) {
        const leaving = `begin="${clock(-Math.max(0, now - done.startedAt))}" dur="${clock(DONE_MS)}" fill="freeze"`
        body +=
          `<circle cx="${CX}" cy="${CY}" r="${CORE}" fill="none" stroke="${c.bone}" stroke-width="1.6" opacity="0">` +
          `<animate attributeName="r" values="${CORE};${CORE + 38}" ${leaving}/>` +
          `<animate attributeName="opacity" values=".6;0" ${leaving}/></circle>`
      }

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="100%" style="display:block;height:auto;">${body}</svg>`
    }

    // ---- Feed Folding & Now Line (1:1 port of alexeyw/lot-map/hooks/feed.ts) ----

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

    // ---- Scoped Styles (using --dsw-alias-* tokens for host controls, original lot-map palette for artwork) ----

    const CSS_TEXT = `
.lm-pane {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  flex: 1 1 auto;
  align-self: stretch;
  overflow: hidden;
  box-sizing: border-box;
  font-family: var(--ds-font-family-code, 'SF Mono', ui-monospace, Menlo, Consolas, monospace);
  color: var(--dsw-alias-label-primary, inherit);
  background: var(--dsw-alias-bg-base, transparent);
}
.lm-scroll {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 8px 12px 12px;
  gap: 8px;
}
.lm-map-wrap {
  display: flex;
  justify-content: center;
  align-items: center;
  flex-shrink: 0;
  width: 100%;
}
.lm-map-box {
  width: 100%;
  max-width: 480px;
  margin: 0 auto;
}
.lm-now-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 24px;
  flex-shrink: 0;
  padding: 2px 2px;
}
.lm-now-text {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 500;
}
.lm-now-meter {
  flex-shrink: 0;
  opacity: 0.65;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.lm-controls {
  display: flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
}
.lm-ctrl-btn {
  appearance: none;
  border: 0;
  background: transparent;
  color: inherit;
  opacity: 0.65;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 6px;
  font-family: inherit;
  font-size: 11px;
  line-height: 1.4;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: opacity 120ms ease, background-color 120ms ease;
}
.lm-ctrl-btn:hover:not(:disabled) {
  opacity: 1;
  background: rgba(128, 128, 128, 0.16);
}
.lm-ctrl-btn:disabled {
  opacity: 0.28;
  cursor: default;
}
.lm-ctrl-btn[aria-pressed="true"] {
  opacity: 1;
  background: rgba(128, 128, 128, 0.22);
}
.lm-feed {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1 1 auto;
  min-height: 160px;
}
.lm-feed-scroll {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
}
.lm-feed-held {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex-shrink: 0;
  padding-top: 4px;
  border-top: 1px solid rgba(128, 128, 128, 0.16);
}
.lm-row {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  line-height: 1.5;
}
.lm-row[data-size="caption"] { font-size: 11px; }
.lm-row[data-size="footnote"] { font-size: 12px; }
.lm-row[data-size="body"] { font-size: 13.5px; }
.lm-now-bar[data-size="caption"] { font-size: 11.5px; }
.lm-now-bar[data-size="footnote"] { font-size: 12.5px; }
.lm-now-bar[data-size="body"] { font-size: 14px; }
.lm-mark {
  flex-shrink: 0;
  width: 12px;
  text-align: center;
}
.lm-station {
  flex-shrink: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.lm-label {
  flex: 1 1 auto;
  min-width: 0;
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
.lm-expand {
  appearance: none;
  border: 0;
  background: transparent;
  color: inherit;
  opacity: 0.55;
  cursor: pointer;
  padding: 0 3px;
  font-family: inherit;
  font-size: inherit;
  line-height: inherit;
  flex-shrink: 0;
}
.lm-expand:hover { opacity: 1; }
.lm-expand:focus-visible,
.lm-ctrl-btn:focus-visible,
.lm-reset-btn:focus-visible,
.lm-hdr-btn:focus-visible {
  outline: 2px solid var(--dsw-alias-brand-primary, #e1ac6e);
  outline-offset: -2px;
}
.lm-time {
  flex-shrink: 0;
  text-align: right;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.lm-row[data-tone="run"] { color: #5b9cf5; }
.lm-pane[data-lm-theme="light"] .lm-row[data-tone="run"] { color: #1b5ec7; }
.lm-row[data-tone="switch"] { color: #e1ac6e; }
.lm-pane[data-lm-theme="light"] .lm-row[data-tone="switch"] { color: #b8762a; }
.lm-row[data-tone="err"] { color: #e8654f; }
.lm-pane[data-lm-theme="light"] .lm-row[data-tone="err"] { color: #c5402b; }
.lm-row[data-tone="ok"] { opacity: 0.72; }
.lm-time[data-dim="true"] { opacity: 0.78; }
.lm-empty {
  opacity: 0.55;
  font-size: 12px;
  padding: 4px 2px;
}
.lm-settings {
  flex-shrink: 0;
  border: 1px solid var(--dsw-alias-border-l1, rgba(128, 128, 128, 0.25));
  background: var(--dsw-alias-bg-layer-1, rgba(128, 128, 128, 0.08));
  color: var(--dsw-alias-label-primary, inherit);
  border-radius: 10px;
  padding: 10px 12px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 8px 12px;
  font-family: var(--dsw-font-family, system-ui, -apple-system, sans-serif);
  font-size: 12px;
}
.lm-field {
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.lm-field-full {
  grid-column: 1 / -1;
}
.lm-field-label {
  font-size: 11px;
  color: var(--dsw-alias-label-secondary, rgba(128, 128, 128, 0.9));
}
.lm-field select,
.lm-field input[type="text"] {
  background: var(--dsw-alias-bg-base, transparent);
  color: var(--dsw-alias-label-primary, inherit);
  border: 1px solid var(--dsw-alias-border-l2, rgba(128, 128, 128, 0.3));
  border-radius: 6px;
  padding: 4px 6px;
  font-size: 12px;
  font-family: inherit;
  outline: none;
  width: 100%;
  box-sizing: border-box;
}
.lm-field select:focus-visible,
.lm-field input[type="text"]:focus-visible {
  border-color: var(--dsw-alias-brand-primary, #4176e6);
}
.lm-check-row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding-top: 14px;
  cursor: pointer;
}
.lm-settings-footer {
  grid-column: 1 / -1;
  display: flex;
  justify-content: flex-end;
  padding-top: 2px;
}
.lm-reset-btn {
  appearance: none;
  border: 1px solid var(--dsw-alias-border-l2, rgba(128, 128, 128, 0.3));
  background: transparent;
  color: var(--dsw-alias-label-secondary, inherit);
  border-radius: 6px;
  padding: 3px 10px;
  font-size: 11px;
  cursor: pointer;
}
.lm-reset-btn:hover {
  color: var(--dsw-alias-label-primary, inherit);
  background: rgba(128, 128, 128, 0.12);
}
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
.lm-hdr-dot {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #e1ac6e;
  box-shadow: 0 0 0 1.5px var(--dsw-alias-bg-base, #0a0c11);
}
.lm-title-icon {
  display: inline-flex;
  align-items: center;
  margin-right: 5px;
  flex-shrink: 0;
}
`

    // ---- Shared Icon Component (pure SVG, zero external imports) ----

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
        const { useProjection } = props
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
        const [truncatedIds, setTruncatedIds] = useState(() => new Set())
        const feedRef = useRef(null)

        // Close settings drawer on Escape
        useEffect(() => {
          if (!showSettings || typeof document === 'undefined') return
          const onKey = (e) => {
            if (e.key === 'Escape') setShowSettings(false)
          }
          document.addEventListener('keydown', onKey)
          return () => document.removeEventListener('keydown', onKey)
        }, [showSettings])

        // Render SVG freshly whenever board or visual setup changes; compute real `now` here so option changes never replay stale pulses.
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

        // Compute turn duration from human message to answer ready (1:1 from pane.tsx)
        const turnMs = useMemo(() => {
          const map = new Map()
          let askedAt
          for (const x of board.entries || []) {
            if (x.station === 'you' && x.from === 'inbound' && x.mark === undefined) askedAt = x.startedAt
            if (x.mark === 'done' && askedAt !== undefined) {
              map.set(x.id, x.startedAt - askedAt)
              askedAt = undefined
            }
          }
          return map
        }, [board.entries])

        const keptRows = useMemo(() => {
          const entries = board.entries || []
          const maxRows = setup.logRows === 'fill' ? Math.max(LIST_ROWS, entries.length) : LIST_ROWS
          return foldRows(entries, maxRows)
        }, [board.entries, setup.logRows])

        const normalRows = useMemo(() => keptRows.filter((r) => !r.isHeld), [keptRows])
        const heldRows = useMemo(() => keptRows.filter((r) => r.isHeld), [keptRows])

        // Real DOM overflow measurement so expand buttons only appear when a row is actually truncated
        useEffect(() => {
          const root = feedRef.current
          if (!root || typeof root.querySelectorAll !== 'function') return undefined
          const measure = () => {
            const next = new Set()
            const nodes = root.querySelectorAll('[data-row-id]')
            for (const el of nodes) {
              const id = el.getAttribute('data-row-id')
              const label = el.querySelector('.lm-label')
              if (id && label && label.scrollWidth > label.clientWidth + 1) {
                next.add(id)
              }
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
        }, [keptRows, setup.textSize, openRowId])

        const stationColCh = useMemo(() => {
          const maxLen = Math.max(6, ...Object.values(t.stations).map((s) => {
            let w = 0
            for (const ch of s) w += /[\u2e80-\uffff]/.test(ch) ? 2 : 1
            return w
          }))
          return `${maxLen + 1}ch`
        }, [t.stations])

        const nowInfo = useMemo(() => nowParts(board, t), [board, t])
        const minimized = env.prefs.minimized === true
        const zoom = typeof env.prefs.zoom === 'number' && ZOOMS.includes(env.prefs.zoom) ? env.prefs.zoom : null

        const stepZoom = useCallback((dir) => {
          const idx = zoom === null ? ZOOMS.length : ZOOMS.indexOf(zoom)
          const nextIdx = Math.min(ZOOMS.length, Math.max(0, (idx < 0 ? ZOOMS.length : idx) + dir))
          bridge.updatePrefs({ zoom: nextIdx >= ZOOMS.length ? null : ZOOMS[nextIdx] })
        }, [zoom])

        const renderRow = (row) => {
          const { entry, times, tookMs, tokens, isShared } = row
          const isSwitch = entry.mark === 'switch'
          const mark = isSwitch ? '◆' : entry.status === 'run' ? '●' : entry.status === 'ok' ? '·' : '✕'
          const tone = entry.status === 'run' ? 'run' : isSwitch ? 'switch' : entry.status === 'ok' ? 'ok' : 'err'
          const whole = turnMs.get(entry.id)
          const took = entry.endedAt === undefined
            ? t.running
            : whole !== undefined && whole > 0
              ? formatMs(whole, t)
              : tookMs > 0
                ? formatMs(tookMs, t)
                : '—'
          const isMoment = took === '—'
          const cost = setup.contextCost && tokens !== undefined ? ` ${isShared ? '~' : ''}+${formatTokens(tokens)}` : ''
          const textLabel = localizeLabel(entry, t)
          const displayLabel = `${textLabel}${times > 1 ? `  +${times - 1}` : ''}`
          const isOpen = openRowId === entry.id
          const isTruncated = truncatedIds.has(entry.id)
          const canExpand = isTruncated || isOpen
          const stationLabel = t.stations[entry.station] ?? entry.station
          const toggleRow = () => setOpenRowId(isOpen ? null : entry.id)

          return h('div', {
            key: entry.id,
            className: 'lm-row',
            'data-row-id': entry.id,
            'data-tone': tone,
            'data-size': setup.textSize,
          },
            h('span', { className: 'lm-mark', 'aria-hidden': true }, mark),
            h('span', { className: 'lm-station', style: { width: stationColCh } }, stationLabel),
            h('span', {
              className: 'lm-label',
              'data-open': isOpen ? 'true' : 'false',
              'data-can-expand': canExpand ? 'true' : undefined,
              title: canExpand && !isOpen ? displayLabel : undefined,
              onClick: canExpand ? toggleRow : undefined,
            }, displayLabel),
            canExpand ? h('button', {
              type: 'button',
              className: 'lm-expand',
              title: isOpen ? t.collapseRow : t.expandRow,
              'aria-label': isOpen ? t.collapseRow : t.expandRow,
              'aria-expanded': isOpen,
              onClick: toggleRow,
            }, isOpen ? '▾' : '▸') : null,
            h('span', {
              className: 'lm-time',
              'data-dim': isMoment ? 'true' : 'false',
              style: { minWidth: setup.contextCost ? '11ch' : '6ch' },
            }, `${took}${cost}`),
          )
        }

        const pal = { ...(setup.theme === 'light' ? LIGHT : DARK), ...setup.colors }

        const settingsDrawer = showSettings ? h('div', { className: 'lm-settings', role: 'region', 'aria-label': t.settings },
          h('label', { className: 'lm-field' },
            h('span', { className: 'lm-field-label' }, t.opt.language),
            h('select', {
              value: env.prefs.language,
              onChange: (e) => bridge.updatePrefs({ language: e.target.value }),
            },
              h('option', { value: 'auto' }, t.opt.auto),
              h('option', { value: 'zh' }, '中文'),
              h('option', { value: 'en' }, 'English'),
            ),
          ),
          h('label', { className: 'lm-field' },
            h('span', { className: 'lm-field-label' }, t.opt.coreName),
            h('input', {
              type: 'text',
              maxLength: 10,
              value: env.prefs.coreName,
              placeholder: 'DSH',
              onChange: (e) => bridge.updatePrefs({ coreName: e.target.value }),
            }),
          ),
          h('label', { className: 'lm-field' },
            h('span', { className: 'lm-field-label' }, t.opt.theme),
            h('select', {
              value: env.prefs.theme,
              onChange: (e) => bridge.updatePrefs({ theme: e.target.value }),
            },
              h('option', { value: 'auto' }, t.opt.auto),
              h('option', { value: 'dark' }, t.opt.dark),
              h('option', { value: 'light' }, t.opt.light),
            ),
          ),
          h('label', { className: 'lm-field' },
            h('span', { className: 'lm-field-label' }, t.opt.background),
            h('select', {
              value: env.prefs.background,
              onChange: (e) => bridge.updatePrefs({ background: e.target.value }),
            },
              h('option', { value: 'solid' }, t.opt.solid),
              h('option', { value: 'transparent' }, t.opt.transparent),
            ),
          ),
          h('label', { className: 'lm-field' },
            h('span', { className: 'lm-field-label' }, t.opt.paneBackground),
            h('select', {
              value: setup.paneBackground,
              onChange: (e) => bridge.updatePrefs({ paneBackground: e.target.value }),
            },
              h('option', { value: 'theme' }, t.opt.paneTheme),
              h('option', { value: 'solid' }, t.opt.paneSolid),
              h('option', { value: 'transparent' }, t.opt.transparent),
              setup.paneBackground.startsWith('#') ? h('option', { value: setup.paneBackground }, setup.paneBackground) : null,
            ),
          ),
          h('label', { className: 'lm-field' },
            h('span', { className: 'lm-field-label' }, t.opt.layout),
            h('select', {
              value: env.prefs.layout,
              onChange: (e) => bridge.updatePrefs({ layout: e.target.value }),
            },
              h('option', { value: 'you-top' }, t.opt.youTop),
              h('option', { value: 'you-bottom' }, t.opt.youBottom),
            ),
          ),
          h('label', { className: 'lm-field' },
            h('span', { className: 'lm-field-label' }, t.opt.motion),
            h('select', {
              value: env.prefs.motion,
              onChange: (e) => bridge.updatePrefs({ motion: e.target.value }),
            },
              h('option', { value: 'full' }, t.opt.full),
              h('option', { value: 'reduced' }, t.opt.reduced),
            ),
          ),
          h('label', { className: 'lm-field' },
            h('span', { className: 'lm-field-label' }, t.opt.contextWindow),
            h('select', {
              value: env.prefs.contextWindow || 'model',
              onChange: (e) => bridge.updatePrefs({ contextWindow: e.target.value }),
            },
              h('option', { value: 'model' }, t.opt.cwModel),
              h('option', { value: 'compaction' }, t.opt.cwCompaction),
            ),
          ),
          h('label', { className: 'lm-field' },
            h('span', { className: 'lm-field-label' }, t.opt.textSize),
            h('select', {
              value: env.prefs.textSize,
              onChange: (e) => bridge.updatePrefs({ textSize: e.target.value }),
            },
              h('option', { value: 'caption' }, t.opt.caption),
              h('option', { value: 'footnote' }, t.opt.footnote),
              h('option', { value: 'body' }, t.opt.body),
            ),
          ),
          h('label', { className: 'lm-field' },
            h('span', { className: 'lm-field-label' }, t.opt.logRows),
            h('select', {
              value: String(env.prefs.logRows),
              onChange: (e) => bridge.updatePrefs({ logRows: e.target.value === 'fill' ? 'fill' : 16 }),
            },
              h('option', { value: '16' }, '16'),
              h('option', { value: 'fill' }, t.opt.fill),
            ),
          ),
          h('label', { className: 'lm-check-row' },
            h('input', {
              type: 'checkbox',
              checked: env.prefs.contextCost === true,
              onChange: (e) => bridge.updatePrefs({ contextCost: e.target.checked }),
            }),
            h('span', null, t.opt.contextCost),
          ),
          h('label', { className: 'lm-check-row' },
            h('input', {
              type: 'checkbox',
              checked: env.prefs.openAtStart === true,
              onChange: (e) => bridge.updatePrefs({ openAtStart: e.target.checked }),
            }),
            h('span', null, t.opt.openAtStart),
          ),
          h('label', { className: 'lm-field lm-field-full' },
            h('span', { className: 'lm-field-label' }, t.opt.colors),
            h('input', {
              type: 'text',
              value: env.prefs.colors || '',
              placeholder: 'accent=#7fb4ff,active=#b8d6ff',
              onChange: (e) => bridge.updatePrefs({ colors: e.target.value }),
            }),
          ),
          h('div', { className: 'lm-settings-footer' },
            h('button', {
              type: 'button',
              className: 'lm-reset-btn',
              onClick: () => bridge.resetPrefs(),
            }, t.reset),
          ),
        ) : null

        const paneStyle = {}
        if (setup.paneBackground === 'transparent') {
          paneStyle.background = 'transparent'
        } else if (setup.paneBackground === 'solid') {
          paneStyle.background = pal.ground
          paneStyle.color = pal.bone
          paneStyle.colorScheme = setup.theme
        } else if (setup.paneBackground.startsWith('#')) {
          paneStyle.background = setup.paneBackground
          paneStyle.color = pal.bone
          paneStyle.colorScheme = setup.theme
        } else if (setup.colors.bone) {
          paneStyle.color = setup.colors.bone
        }

        return h('div', {
          className: 'lm-pane',
          'data-lm-theme': setup.theme,
          'data-lm-bg': setup.background,
          style: Object.keys(paneStyle).length > 0 ? paneStyle : undefined,
        },
          h('div', { className: 'lm-scroll' },
            !minimized ? h('div', { className: 'lm-map-wrap' },
              h('div', {
                className: 'lm-map-box',
                style: zoom !== null ? { width: `${zoom}px`, maxWidth: '100%' } : undefined,
                role: 'img',
                'aria-label': `${t.title}. ${nowInfo.what}`,
                dangerouslySetInnerHTML: { __html: svgHtml },
              }),
            ) : null,

            h('div', { className: 'lm-now-bar', 'data-size': setup.textSize },
              h('span', { className: 'lm-now-text', title: nowInfo.what }, nowInfo.what),
              minimized && nowInfo.meter ? h('span', { className: 'lm-now-meter' }, nowInfo.meter) : null,
              h('div', { className: 'lm-controls' },
                !minimized ? h('button', {
                  type: 'button',
                  className: 'lm-ctrl-btn',
                  title: t.zoomOut,
                  'aria-label': t.zoomOut,
                  disabled: zoom === ZOOMS[0],
                  onClick: () => stepZoom(-1),
                }, '−') : null,
                !minimized ? h('button', {
                  type: 'button',
                  className: 'lm-ctrl-btn',
                  title: t.zoomIn,
                  'aria-label': t.zoomIn,
                  disabled: zoom === null,
                  onClick: () => stepZoom(1),
                }, '+') : null,
                h('button', {
                  type: 'button',
                  className: 'lm-ctrl-btn',
                  title: minimized ? t.showMap : t.hideMap,
                  'aria-label': minimized ? t.showMap : t.hideMap,
                  onClick: () => bridge.updatePrefs({ minimized: !minimized }),
                }, minimized ? t.showMap : t.hideMap),
                h('button', {
                  type: 'button',
                  className: 'lm-ctrl-btn',
                  title: t.settings,
                  'aria-label': t.settings,
                  'aria-pressed': showSettings,
                  onClick: () => setShowSettings((v) => !v),
                }, '⚙'),
              ),
            ),

            settingsDrawer,

            h('div', { className: 'lm-feed', ref: feedRef },
              keptRows.length === 0
                ? h('div', { className: 'lm-empty' }, t.nothingYet)
                : h(React.Fragment, null,
                    h('div', { className: 'lm-feed-scroll' }, normalRows.map(renderRow)),
                    heldRows.length > 0 ? h('div', { className: 'lm-feed-held' }, heldRows.map(renderRow)) : null,
                  ),
            ),
          ),
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

        // Handle `openAtStart` option: only open automatically for fresh sessions, not historical ones on reload
        useEffect(() => {
          if (!sessionId || env.prefs.openAtStart !== true) return
          if (autoOpenedSessions.has(sessionId)) return
          if (entries.length > 2) {
            autoOpenedSessions.add(sessionId)
            saveOpenedSet(autoOpenedSessions)
            return
          }
          autoOpenedSessions.add(sessionId)
          saveOpenedSet(autoOpenedSessions)
          const timer = setTimeout(() => {
            try {
              ctx.sidebarRight?.openTabIn?.(sessionId, TAB_KIND)
            } catch { /* ignore if surface unmounted */ }
          }, 120)
          return () => clearTimeout(timer)
        }, [sessionId, env.prefs.openAtStart, entries.length])

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
        MAP_ASPECT,
        drawMap,
        foldRows,
        nowParts,
        routeOf,
        formatMs,
        formatTokens,
        shortModel,
        resolveSetup,
        parseColors,
        parsePaneBackground,
        localizeLabel,
      },
    }
  },
})
