// Pure synchronous DSH session projection for Lot Map.
// Folds committed SessionEvents into a serializable Board snapshot compatible with lot-map's drawMap + feed.
import { classify, clean, createClassifySetup, firstLine, memoryIds, shortModel } from './classify.js'

const KEEP = 80
const HELD = 40
const CREW = 12
const SHARED_AT_MOST = 3

const VALID_STATIONS = new Set(['you', 'model', 'memory', 'files', 'shell', 'web', 'browser', 'agents', 'skills', 'hooks'])

/**
 * Tools whose call keeps a subagent at work. DSH runs each child in its own
 * Session, so the parent's log carries the delegation call and nothing of the
 * child's loop: a child circles the Agents station exactly while that call runs.
 */
const DELEGATION_TOOLS = new Set(['subagent', 'subagent_fork', 'workflow', 'Agent', 'Workflow'])
const TASK_TOOLS = new Set([
  'bash', 'Bash', 'pwsh', 'PowerShell',
  'subagent', 'subagent_fork', 'Agent', 'Task',
  'workflow', 'Workflow', 'Monitor', 'skill', 'Skill',
])
const VALID_STATUS = new Set(['run', 'ok', 'err', 'block'])
const VALID_FROM = new Set(['core', 'agents', 'inbound'])

const isFault = (status) => status === 'err' || status === 'block'

function removeOneAgent(agents, key) {
  if (!Array.isArray(agents) || key === undefined) return agents
  const idx = agents.indexOf(key)
  if (idx < 0) return agents
  return [...agents.slice(0, idx), ...agents.slice(idx + 1)]
}

const kept = (entries) => {
  const from = entries.length - KEEP
  if (from <= 0) return entries
  let room = HELD
  const held = new Set()
  for (let i = from - 1; i >= 0 && room > 0; i--) {
    const e = entries[i]
    if (e.status === 'run' && e.task !== undefined) {
      held.add(e)
      room--
    }
  }
  return entries.filter((e, i) => i >= from || held.has(e))
}

const oneMore = (faults, station) => ({ ...(faults ?? {}), [station]: (faults?.[station] ?? 0) + 1 })

/**
 * Exact port of alexeyw/lot-map's `charged()` from hooks/cost.ts.
 * Attributes step context growth (after - before) to calls answered by that step.
 */
export function charged(board, calls, before, after) {
  if (before === undefined || after === undefined || calls.length === 0 || after <= before) return board
  const grown = after - before
  const callSet = new Set(calls)
  const own = board.entries.filter((e) => callSet.has(e.id))
  if (own.length === 0) return board
  const share = own.length <= SHARED_AT_MOST ? grown / own.length : undefined
  const spent = { ...(board.spent ?? {}) }
  const add = (station, tokens) => {
    spent[station] = Math.round((spent[station] ?? 0) + tokens)
  }
  if (share !== undefined) {
    for (const e of own) add(e.station, share)
  } else if (new Set(own.map((e) => e.station)).size === 1 && own[0] !== undefined) {
    add(own[0].station, grown)
  }
  return {
    ...board,
    spent,
    entries: share === undefined
      ? board.entries
      : board.entries.map((e) => (callSet.has(e.id)
          ? { ...e, tokens: Math.round(share), ...(own.length > 1 ? { shared: true } : {}) }
          : e)),
  }
}

function parseArgs(raw) {
  if (typeof raw !== 'string' || raw.trim() === '') return {}
  try {
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function usagePromptTokens(usage) {
  if (!usage || typeof usage !== 'object') return undefined
  const input = typeof usage.inputTokens === 'number' && Number.isFinite(usage.inputTokens) ? usage.inputTokens : undefined
  if (input === undefined) return undefined
  const cacheRead = typeof usage.cacheReadTokens === 'number' && Number.isFinite(usage.cacheReadTokens) ? usage.cacheReadTokens : 0
  const cacheWrite = typeof usage.cacheWriteTokens === 'number' && Number.isFinite(usage.cacheWriteTokens) ? usage.cacheWriteTokens : 0
  return Math.max(0, Math.round(input + cacheRead + cacheWrite))
}

function extractText(content) {
  if (typeof content === 'string') return content
  if (!Array.isArray(content)) return ''
  let out = ''
  for (const block of content) {
    if (block && typeof block === 'object' && block.type === 'text' && typeof block.text === 'string') {
      out += (out ? '\n' : '') + block.text
    }
  }
  return out
}

function isDenialError(error, text) {
  const code = typeof error?.code === 'string' ? error.code : ''
  if (/DENY|DENIED|BLOCK|GUARD|PERMISSION|REJECT|POLICY|SANDBOX/i.test(code)) return true
  if (typeof text === 'string' && /\[sandbox:.*denied|permission denied|blocked by guard/i.test(text)) return true
  return false
}

function appendEntry(board, entry, { uncounted = false } = {}) {
  const nextCounts = uncounted
    ? board.counts
    : { ...board.counts, [entry.station]: (board.counts[entry.station] ?? 0) + 1 }
  const pushed = entry.station === 'memory' && entry.from === 'inbound' && !uncounted
    ? (board.pushed ?? 0) + 1
    : board.pushed
  const faults = isFault(entry.status) && entry.station !== 'you'
    ? oneMore(board.faults, entry.station)
    : board.faults
  return {
    ...board,
    entries: kept([...board.entries, entry]),
    counts: nextCounts,
    ...(pushed !== undefined ? { pushed } : {}),
    ...(faults !== undefined ? { faults } : {}),
  }
}

function finishEntry(board, id, status, endedAt) {
  let matched = null
  const entries = board.entries.map((e) => {
    if (e.id === id && e.status === 'run') {
      matched = e
      return { ...e, status, endedAt }
    }
    return e
  })
  if (matched === null) return board
  return {
    ...board,
    entries,
    ...(isFault(status) ? { faults: oneMore(board.faults, matched.station) } : {}),
  }
}

function taskOf(data, resultText) {
  const candidates = []
  if (data && typeof data === 'object') {
    candidates.push(data)
    if (data.result && typeof data.result === 'object') candidates.push(data.result)
  }
  if (typeof resultText === 'string' && resultText.trimStart().startsWith('{')) {
    try {
      const parsed = JSON.parse(resultText)
      if (parsed && typeof parsed === 'object') candidates.push(parsed)
    } catch { /* ignore non-JSON text */ }
  }
  const idOf = (v) => (typeof v === 'string' && /^[\w-]{1,64}$/.test(v) ? v : undefined)
  for (const r of candidates) {
    if (r.status === 'async_launched' || r.status === 'remote_launched') {
      const found = idOf(r.agentId) ?? idOf(r.taskId)
      if (found !== undefined) return found
    }
    const bg = idOf(r.backgroundTaskId)
      ?? ((r.status === 'running' || r.status === 'started') ? idOf(r.jobId) : undefined)
      ?? (typeof r.timeoutMs === 'number' ? idOf(r.taskId) : undefined)
    if (bg !== undefined) return bg
  }
  return undefined
}

function taskNotice(text) {
  if (typeof text !== 'string' || !text.trimStart().startsWith('<task-notification>')) return undefined
  const id = /<task-id>([\w-]{1,64})<\/task-id>/.exec(text)?.[1]
  if (id === undefined) return undefined
  const word = /<status>(\w+)<\/status>/.exec(text)?.[1]
  if (word === undefined) return { id }
  return { id, status: word === 'failed' ? 'err' : 'ok' }
}

function attachTask(board, id, task) {
  let matched = false
  const entries = board.entries.map((e) => {
    if (e.id === id && e.status === 'run') {
      matched = true
      return { ...e, task }
    }
    return e
  })
  return matched ? { ...board, entries } : board
}

function settleTask(board, taskId, status, endedAt) {
  let matched = null
  const entries = board.entries.map((e) => {
    if (e.task === taskId && e.status === 'run') {
      matched = e
      return { ...e, status, endedAt }
    }
    return e
  })
  if (matched === null) return board
  const nextAgents = Array.isArray(board.agents) && board.agents.includes(taskId)
    ? removeOneAgent(board.agents, taskId)
    : board.agents
  return {
    ...board,
    entries,
    ...(nextAgents !== board.agents ? { agents: nextAgents } : {}),
    ...(isFault(status) ? { faults: oneMore(board.faults, matched.station) } : {}),
  }
}

function recordModel(board, model, seq, now) {
  if (model === undefined || board.model === model) return board
  if (board.model !== undefined) {
    const switchEntry = {
      id: `sw-${seq}`,
      station: 'model',
      label: `${shortModel(board.model)} → ${shortModel(model)}`,
      from: 'core',
      startedAt: now,
      endedAt: now,
      status: 'ok',
      mark: 'switch',
    }
    return appendEntry({ ...board, model, switchedAt: now }, switchEntry, { uncounted: true })
  }
  return { ...board, model }
}

function parseBoardView(value) {
  if (!value || typeof value !== 'object') throw new TypeError('lotMap view must be an object')
  if (!Array.isArray(value.entries)) throw new TypeError('lotMap view.entries must be an array')
  if (!value.counts || typeof value.counts !== 'object') throw new TypeError('lotMap view.counts must be an object')
  return value
}

function parseState(value) {
  if (!value || typeof value !== 'object') throw new TypeError('lotMap state must be an object')
  parseBoardView(value.board)
  return value
}

const stateSchema = { parse: parseState }
const viewSchema = { parse: parseBoardView }

export function createLotMapProjection(options = {}) {
  const setup = createClassifySetup(options)

  return {
    key: 'lotMap',
    stateVersion: 1,
    stateSchema,
    init: () => ({
      board: {
        entries: [],
        counts: {},
        openRequestSeq: 0,
      },
      contextWindow: null,
      compactionWindow: null,
      lastTokens: null,
      waitingCalls: [],
      answeredCalls: [],
      openStepId: null,
      openCompactionId: null,
      callEntryIds: {},
      callTools: {},
      agentCallIds: {},
    }),
    apply: (state, event) => {
      if (!event || typeof event.type !== 'string') return state
      const now = typeof event.time === 'number' && Number.isFinite(event.time) ? event.time : 0
      const seq = typeof event.seq === 'number' ? event.seq : 0

      switch (event.type) {
        case 'request/context': {
          const data = event.data ?? {}
          const model = typeof data.model === 'string' && data.model !== '' ? clean(data.model, 60) : undefined
          const cw = typeof data.contextWindow === 'number' && data.contextWindow > 0 ? data.contextWindow : state.contextWindow
          const rawCompact = data.autoCompactWindow ?? data.compactionWindow ?? data.compactThreshold
          const cmpWin = typeof rawCompact === 'number' && Number.isFinite(rawCompact) && rawCompact > 0 ? rawCompact : state.compactionWindow
          let board = recordModel(state.board, model, seq, now)
          if ((cw !== state.contextWindow || cmpWin !== state.compactionWindow) && state.lastTokens !== null) {
            if (cw !== null && cw > 0) {
              const pct = Math.min(100, Math.round((state.lastTokens / cw) * 100))
              if (board.context !== pct) board = { ...board, context: pct }
            }
            if (cmpWin !== null && cmpWin > 0) {
              const compactPct = Math.min(100, Math.round((state.lastTokens / cmpWin) * 100))
              if (board.compactContext !== compactPct) board = { ...board, compactContext: compactPct }
            }
          }
          if (board === state.board && cw === state.contextWindow && cmpWin === state.compactionWindow) return state
          return { ...state, board, contextWindow: cw, compactionWindow: cmpWin }
        }

        case 'request/header': {
          const modelRaw = event.data?.header?.config?.model
          if (typeof modelRaw !== 'string' || modelRaw === '') return state
          const model = clean(modelRaw, 60)
          const board = recordModel(state.board, model, seq, now)
          if (board === state.board) return state
          return { ...state, board }
        }

        case 'user/message': {
          const msg = event.data ?? {}
          const source = msg.source && typeof msg.source === 'object' ? msg.source : {}
          const kind = typeof source.kind === 'string' ? source.kind : 'user'
          const form = typeof source.form === 'string' ? source.form : undefined
          const text = extractText(msg.content)

          // Human user message: clears faults and lights You station
          if (kind === 'user' || kind === 'retry') {
            const hasAttachment = Array.isArray(msg.content) && msg.content.some((b) => b && typeof b === 'object' && b.type !== 'text')
            if (text.trim() === '' && !hasAttachment) return state
            let board = {
              ...state.board,
              turns: (state.board.turns ?? 0) + 1,
              ...(state.board.faults !== undefined && Object.keys(state.board.faults).length > 0 ? { faults: {} } : {}),
            }
            board = appendEntry(board, {
              id: `u-${seq}`,
              station: 'you',
              label: 'new message',
              labelKey: 'newMessage',
              from: 'inbound',
              startedAt: now,
              endedAt: now,
              status: 'ok',
            })
            return { ...state, board }
          }

          // Background task notification: settles matching running task without lighting You
          const notice = taskNotice(text)
          if (notice !== undefined) {
            if (notice.status !== undefined) {
              const board = settleTask(state.board, notice.id, notice.status, now)
              return board === state.board ? state : { ...state, board }
            }
            return state
          }

          // Subagent completion / relay notice: settle matching active subagent if known
          if (kind.includes('subagent') || form === 'relay' || /subagent/i.test(kind)) {
            const currentAgents = state.board.agents ?? []
            const childId = typeof source.childId === 'string'
              ? source.childId
              : typeof source.agentId === 'string'
                ? source.agentId
                : typeof source.sender === 'string'
                  ? source.sender
                  : undefined
            let nextAgents = currentAgents
            if (childId && currentAgents.includes(childId)) {
              nextAgents = removeOneAgent(currentAgents, childId)
            } else if (currentAgents.length > 0 && (form === 'notice' || /complete|finish|settle|done/i.test(text))) {
              // Settle by name match inside text if present
              const matched = currentAgents.find((a) => text.includes(a))
              if (matched) nextAgents = removeOneAgent(currentAgents, matched)
            }
            if (nextAgents !== currentAgents) {
              const board = { ...state.board, agents: nextAgents }
              return { ...state, board }
            }
            return state
          }

          // Memory / recall injection (e.g. Mnemon runtime memory snapshot or hook records)
          const ids = setup.hookRecords ? memoryIds(text) : []
          const atStart = state.board.entries.length === 0 || form === 'session-start' || /start/i.test(kind)
          if (kind.includes('memory') || kind.includes('mnemon') || form === 'recall' || ids.length > 0) {
            let board = appendEntry(state.board, {
              id: `hk-${seq}`,
              station: 'hooks',
              label: atStart ? 'added memory at session start' : 'added memory to the message',
              labelKey: atStart ? 'addedMemoryAtStart' : 'addedMemoryToMessage',
              from: 'core',
              startedAt: now,
              endedAt: now,
              status: 'ok',
            })
            const shown = ids.slice(0, 6).map((id) => `#${id}`).join(' ')
            board = appendEntry(board, {
              id: `mem-${seq}`,
              station: 'memory',
              label: ids.length > 0 ? `${ids.length} records: ${shown}${ids.length > 6 ? ' …' : ''}` : clean(source.summary || kind, 60) || 'memory context',
              ...(ids.length > 0 ? { labelKey: 'records', labelArgs: [ids.length, `${shown}${ids.length > 6 ? ' …' : ''}`] } : {}),
              from: 'inbound',
              startedAt: now,
              endedAt: now,
              status: 'ok',
            })
            return { ...state, board }
          }

          // Other injected context (instructions, notice, catalog, skill content)
          if (form === 'instructions' || form === 'notice' || form === 'catalog' || form === 'session-start') {
            const board = appendEntry(state.board, {
              id: `ctx-${seq}`,
              station: 'hooks',
              label: atStart ? 'added context at session start' : 'added context to the message',
              labelKey: atStart ? 'addedContextAtStart' : 'addedContextToMessage',
              from: 'core',
              startedAt: now,
              endedAt: now,
              status: 'ok',
            })
            return { ...state, board }
          }

          return state
        }

        case 'step/start': {
          const stepNum = typeof event.data?.step === 'number' ? event.data.step : ((state.board.step ?? 0) + 1)
          const id = `st-${seq}`
          const modelName = state.board.model ? shortModel(state.board.model) : 'model'
          const board = appendEntry(
            { ...state.board, step: stepNum },
            {
              id,
              station: 'model',
              label: `${modelName} · step ${stepNum}`,
              labelKey: 'modelStep',
              labelArgs: [modelName, stepNum],
              from: 'core',
              startedAt: now,
              status: 'run',
            },
          )
          return {
            ...state,
            board,
            openStepId: id,
            answeredCalls: state.waitingCalls,
            waitingCalls: [],
          }
        }

        case 'assistant/message': {
          const data = event.data ?? {}
          const modelFromSource = typeof data.message?.source?.model === 'string' && data.message.source.model !== ''
            ? clean(data.message.source.model, 60)
            : undefined
          let board = recordModel(state.board, modelFromSource, seq, now)

          const tokens = usagePromptTokens(data.usage)
          if (tokens !== undefined) {
            if (state.contextWindow !== null && state.contextWindow > 0) {
              board = { ...board, context: Math.min(100, Math.round((tokens / state.contextWindow) * 100)) }
            }
            if (state.compactionWindow !== null && state.compactionWindow > 0) {
              board = { ...board, compactContext: Math.min(100, Math.round((tokens / state.compactionWindow) * 100)) }
            }
          }

          if (state.openStepId !== null) {
            board = finishEntry(board, state.openStepId, data.interrupted ? 'err' : 'ok', now)
          }

          if (tokens !== undefined && state.answeredCalls.length > 0 && state.lastTokens !== null) {
            board = charged(board, state.answeredCalls, state.lastTokens, tokens)
          }

          return {
            ...state,
            board,
            openStepId: null,
            answeredCalls: [],
            lastTokens: tokens !== undefined ? tokens : null,
          }
        }

        case 'step/end': {
          if (state.openStepId === null) return state
          const board = finishEntry(state.board, state.openStepId, 'ok', now)
          return { ...state, board, openStepId: null, answeredCalls: [] }
        }

        case 'tool/call': {
          const data = event.data ?? {}
          const callId = typeof data.callId === 'string' ? data.callId : `c-${seq}`
          const toolName = typeof data.name === 'string' ? data.name : 'tool'
          const input = parseArgs(data.arguments)
          const seen = classify(toolName, input, setup)
          const id = `tc-${seq}`
          const entry = {
            id,
            station: VALID_STATIONS.has(seen.station) ? seen.station : 'shell',
            label: clean(seen.label || toolName),
            ...(seen.labelKey ? { labelKey: seen.labelKey } : {}),
            ...(seen.labelArgs ? { labelArgs: seen.labelArgs } : {}),
            from: 'core',
            startedAt: now,
            status: 'run',
          }
          const board = appendEntry(state.board, entry)
          // A delegation call keeps its child circling the Agents station until the call answers.
          const agentKey = DELEGATION_TOOLS.has(toolName)
            ? (typeof input.name === 'string' && input.name !== '' ? input.name : callId)
            : undefined
          const nextAgents = agentKey !== undefined
            ? [...(state.board.agents ?? []), agentKey].slice(-CREW)
            : state.board.agents
          return {
            ...state,
            board: nextAgents === state.board.agents ? board : { ...board, agents: nextAgents },
            waitingCalls: [...state.waitingCalls, id],
            callEntryIds: { ...state.callEntryIds, [callId]: id },
            callTools: { ...state.callTools, [callId]: toolName },
            agentCallIds: agentKey === undefined ? state.agentCallIds : { ...state.agentCallIds, [callId]: agentKey },
          }
        }

        case 'tool/result': {
          const data = event.data ?? {}
          const msg = data.message ?? {}
          const callId = typeof msg.source?.callId === 'string' ? msg.source.callId : undefined
          if (callId === undefined || !Object.hasOwn(state.callEntryIds, callId)) return state
          const entryId = state.callEntryIds[callId]
          const toolName = state.callTools[callId] ?? 'tool'
          const nextCallEntryIds = { ...state.callEntryIds }
          const nextCallTools = { ...state.callTools }
          const nextAgentCallIds = { ...(state.agentCallIds ?? {}) }
          const agentKey = Object.hasOwn(nextAgentCallIds, callId) ? nextAgentCallIds[callId] : undefined
          delete nextCallEntryIds[callId]
          delete nextCallTools[callId]
          delete nextAgentCallIds[callId]

          const resultText = extractText(msg.content)
          const isErr = msg.isError === true || data.error !== undefined
          const denied = isErr && isDenialError(data.error, resultText)

          if (!isErr && !denied && TASK_TOOLS.has(toolName)) {
            const task = taskOf(data, resultText)
            if (task !== undefined) {
              let board = attachTask(state.board, entryId, task)
              if (agentKey !== undefined) {
                const curAgents = board.agents ?? []
                const idx = curAgents.indexOf(agentKey)
                if (idx >= 0 && agentKey !== task) {
                  const replaced = [...curAgents.slice(0, idx), task, ...curAgents.slice(idx + 1)]
                  board = { ...board, agents: replaced }
                }
              }
              return {
                ...state,
                board,
                callEntryIds: nextCallEntryIds,
                callTools: nextCallTools,
                agentCallIds: nextAgentCallIds,
              }
            }
          }

          const status = denied ? 'block' : isErr ? 'err' : 'ok'

          let board = finishEntry(state.board, entryId, status, now)

          if (denied) {
            const reasonText = setup.hookReasons ? firstLine(data.error?.reason || resultText) : ''
            board = appendEntry(board, {
              id: `hk-blk-${seq}`,
              station: 'hooks',
              label: reasonText || `stopped ${toolName}`,
              ...(reasonText ? {} : { labelKey: 'stopped', labelArgs: [toolName] }),
              from: 'core',
              startedAt: now,
              endedAt: now,
              status: 'block',
            })
          }

          return {
            ...state,
            board: agentKey === undefined || !(state.board.agents ?? []).includes(agentKey)
              ? board
              : { ...board, agents: removeOneAgent(state.board.agents, agentKey) },
            callEntryIds: nextCallEntryIds,
            callTools: nextCallTools,
            agentCallIds: nextAgentCallIds,
          }
        }

        case 'compaction/start': {
          const id = `cmp-${seq}`
          const board = appendEntry(state.board, {
            id,
            station: 'model',
            label: 'compacting context',
            labelKey: 'compacting',
            from: 'core',
            startedAt: now,
            status: 'run',
          })
          return {
            ...state,
            board,
            openCompactionId: id,
            waitingCalls: [],
            answeredCalls: [],
            lastTokens: null,
          }
        }

        case 'compaction/end': {
          if (state.openCompactionId === null) return state
          const status = event.data?.error ? 'err' : 'ok'
          const board = finishEntry(state.board, state.openCompactionId, status, now)
          return { ...state, board, openCompactionId: null }
        }

        case 'subagent/catalog': {
          // The catalog is durable membership, not work: a finished child would circle
          // the Agents station forever. A child circles exactly while its delegation
          // call runs, which `tool/call` and `tool/result` already track.
          return state
        }

        case 'command/run': {
          const data = event.data ?? {}
          const cmdName = typeof data.name === 'string' ? data.name : ''
          if (!cmdName) return state
          let board = state.board
          if (cmdName === 'lot-map') {
            board = { ...board, openRequestSeq: (board.openRequestSeq ?? 0) + 1 }
          }
          board = appendEntry(board, {
            id: `cmd-${seq}`,
            station: 'skills',
            label: `/${clean(cmdName, 40)}`,
            from: 'core',
            startedAt: now,
            endedAt: now,
            status: 'ok',
          })
          return { ...state, board }
        }

        case 'turn/end': {
          const reasonKind = event.data?.reason?.kind
          const isErrEnd = reasonKind === 'error'
          const isAborted = isErrEnd || reasonKind === 'aborted' || reasonKind === 'interrupted'
          let board = state.board

          // Close any lingering core running entries (e.g. aborted or errored step/tool)
          const hasLingering = board.entries.some((e) => e.status === 'run' && e.from === 'core' && e.task === undefined)
          if (hasLingering) {
            let nextFaults = board.faults
            const entries = board.entries.map((e) => {
              if (e.status === 'run' && e.from === 'core' && e.task === undefined) {
                const nextStatus = isErrEnd ? 'err' : 'ok'
                if (isErrEnd && e.station !== 'you') nextFaults = oneMore(nextFaults, e.station)
                return { ...e, status: nextStatus, endedAt: now }
              }
              return e
            })
            board = {
              ...board,
              entries,
              ...(nextFaults !== board.faults ? { faults: nextFaults } : {}),
            }
          }

          // Clear non-background agents so aborted delegation calls do not leave permanent orbiting dots
          if (Array.isArray(board.agents) && board.agents.length > 0) {
            const activeTaskIds = new Set(
              board.entries.filter((e) => e.status === 'run' && e.task !== undefined).map((e) => e.task),
            )
            const keptAgents = board.agents.filter((a) => activeTaskIds.has(a))
            if (keptAgents.length !== board.agents.length) {
              board = { ...board, agents: keptAgents }
            }
          }

          // Only emit answer ready / turn interrupted if the turn actually did work
          if (board.entries.length > 0) {
            board = appendEntry(board, {
              id: `te-${seq}`,
              station: 'you',
              label: isAborted ? 'turn interrupted' : 'answer ready',
              labelKey: isAborted ? 'turnAborted' : 'answerReady',
              from: 'core',
              startedAt: now,
              endedAt: now,
              status: isAborted ? 'err' : 'ok',
              ...(isAborted ? {} : { mark: 'done' }),
            })
          }

          return {
            ...state,
            board,
            openStepId: null,
            openCompactionId: null,
            waitingCalls: [],
            answeredCalls: [],
            callEntryIds: {},
            callTools: {},
            agentCallIds: {},
          }
        }

        default:
          return state
      }
    },
    wire: {
      viewSchema,
      // Reuses exact `state.board` reference so unchanged internal fields suppress wire publication!
      view: (state) => state.board,
      summary: false,
    },
  }
}

export { VALID_FROM, VALID_STATIONS, VALID_STATUS }
