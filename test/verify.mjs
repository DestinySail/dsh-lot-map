import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { fileURLToPath } from 'node:url'

import { classify, clean, createClassifySetup, hostOf, shortModel } from '../lib/classify.js'
import { charged, createLotMapProjection } from '../lib/projection.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

// 1. Manifest, locale, icon, and detail asset checks
{
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'))
  assert.equal(pkg.name, 'dsh-lot-map')
  assert.equal(pkg.dsh.bundle.patch, './cordis.patch.yml')
  assert.equal(pkg.dsh.client.platform, 'web')
  assert.equal(pkg.exports['./icon'], './icon.svg')
  assert.equal(pkg.exports['./locale/*.json'], './locale/*.json')
  assert.equal(pkg.exports['./client'], './client.js')

  for (const loc of ['en', 'zh']) {
    const data = JSON.parse(fs.readFileSync(path.join(root, 'locale', `${loc}.json`), 'utf8'))
    assert.ok(data.meta?.title?.length > 0, `missing title in ${loc}`)
    assert.ok(data.meta?.description?.length > 20, `missing description in ${loc}`)
    assert.ok(data.meta?.detail?.endsWith('.md'), `missing detail in ${loc}`)
    const detailPath = path.join(root, data.meta.detail)
    assert.ok(fs.existsSync(detailPath), `detail file missing: ${detailPath}`)
    const detailText = fs.readFileSync(detailPath, 'utf8').trim()
    assert.match(detailText, /^!\[.+\]\(preview\.svg\)$/, `detail must be a single image line in ${loc}`)
  }

  const iconSvg = fs.readFileSync(path.join(root, 'icon.svg'), 'utf8')
  assert.ok(iconSvg.includes('viewBox="0 0 36 36"'))
  assert.ok(!iconSvg.includes('<script') && !iconSvg.includes('<style') && !iconSvg.includes('<text'))

  const previewSvg = fs.readFileSync(path.join(root, 'docs', 'preview.svg'), 'utf8')
  assert.ok(previewSvg.includes('viewBox="0 0 640 300"'))
  assert.ok(!previewSvg.includes('<script') && !previewSvg.includes('<style') && !previewSvg.includes('<text'))
  console.log('[PASS] Manifest, locales, icon.svg, and detail assets verified')
}

// 2. Classifier tests (DSH + Claude Code + Bash + PowerShell + MCP)
{
  const setup = createClassifySetup({
    memoryServers: 'custom-mem',
    memoryCommands: 'recall',
    memorySubcommands: 'search',
    serverStations: 'myfs=files',
    commandStations: 'gh=agents',
  })

  // Files
  assert.deepEqual(classify('read', { file_path: 'C:\\repo\\src\\auth\\tokens.ts' }, setup), { station: 'files', label: 'auth/tokens.ts' })
  assert.deepEqual(classify('edit', { file_path: '/app/hooks/draw.ts' }, setup), { station: 'files', label: 'hooks/draw.ts' })
  assert.equal(classify('grep', { pattern: 'secret' }, setup).station, 'files')
  assert.equal(classify('glob', { pattern: '*.ts' }, setup).station, 'files')

  // Memory
  assert.equal(classify('mnemon_recall', { query: 'test' }, setup).station, 'memory')
  assert.equal(classify('mnemon_runtime_memory', { action: 'add' }, setup).station, 'memory')
  assert.equal(classify('read', { file_path: 'C:\\Users\\me\\.dsh\\MEMORY.md' }, setup).station, 'memory')
  assert.equal(classify('mcp__custom-mem__get_note', { id: 42 }, setup).label, 'get note #42')
  assert.equal(classify('bash', { command: 'recall search something' }, setup).station, 'memory')
  assert.equal(classify('bash', { command: 'recall search something' }, setup).label, 'search')

  // Shell vs Files vs Network (Bash & PowerShell)
  assert.equal(classify('bash', { command: 'cat src/a.ts | grep foo' }, setup).station, 'files')
  assert.equal(classify('pwsh', { command: 'Get-Content src/a.ts | Select-String foo' }, setup).station, 'files')
  assert.equal(classify('pwsh', { command: 'Invoke-WebRequest https://example.com' }, setup).station, 'web')
  assert.equal(classify('bash', { command: 'curl -s https://example.com' }, setup).station, 'web')
  assert.equal(classify('bash', { command: 'git push origin main' }, setup).station, 'web')
  assert.equal(classify('bash', { command: 'git status' }, setup).station, 'shell')
  assert.equal(classify('bash', { command: 'npx --no-install tsc --noEmit' }, setup).station, 'shell')
  assert.equal(classify('bash', { command: 'npx create-vite@latest' }, setup).station, 'web')
  assert.equal(classify('bash', { command: 'sudo env A=1 curl https://x.test' }, setup).station, 'web')
  assert.equal(classify('bash', { command: 'gh pr list' }, setup).station, 'agents')
  assert.equal(classify('bash', { command: 'cat <<\'EOF\'\ncurl https://not-run.test\nEOF' }, setup).station, 'files')
  assert.equal(classify('bash', { command: 'cat <<EOF\n$(curl https://actually-run.test)\nEOF' }, setup).station, 'web')

  // Network, Browser, Agents, Skills, You
  assert.deepEqual(classify('web_fetch', { url: 'https://user:pa/ss@docs.example.com/a/b?q=1' }, setup), { station: 'web', label: 'docs.example.com' })
  assert.equal(classify('web_search', { queries: ['secret query'] }, setup).label, 'web search')
  assert.equal(classify('mcp__playwright__navigate', { url: 'https://localhost:3000/home' }, setup).station, 'browser')
  assert.equal(classify('mcp__playwright__navigate', { url: 'https://localhost:3000/home' }, setup).label, 'localhost:3000')
  assert.equal(classify('mcp__myfs__read_node', {}, setup).station, 'files')
  assert.equal(classify('subagent', { description: 'Review diff' }, setup).station, 'agents')
  assert.equal(classify('skill', { name: 'dsh-doc' }, setup).station, 'skills')
  assert.equal(classify('ask_user_question', {}, setup).station, 'you')
  assert.equal(classify('todo_write', {}, setup).station, 'you')
  assert.equal(hostOf('https://example.com:8080/secret?k=1'), 'example.com:8080')
  assert.equal(shortModel('claude-opus-5-5'), 'opus 5.5')
  assert.equal(shortModel('claude-sonnet-4-20250514'), 'sonnet 4')
  assert.equal(shortModel('deepseek-v3-0324'), 'deepseek-v3-0324')
  assert.equal(shortModel('google/gemini-4-neon'), 'gemini-4-neon')
  assert.equal(clean('hello\u0000\nworld'), 'hello world')

  // PowerShell conditionals/script blocks & Windows memoryPaths case-insensitivity
  assert.equal(classify('pwsh', { command: 'if (Test-Path $p) { Get-Content $p }' }, setup).station, 'files')
  assert.equal(classify('pwsh', { command: 'if (Test-Path $p) { Invoke-WebRequest https://x.test }' }, setup).station, 'web')
  assert.equal(classify('read', { file_path: 'C:\\repo\\docs\\USER.md' }, setup).station, 'files')
  const winSetup = createClassifySetup({ memoryPaths: 'C:\\Users\\Alice\\MemoryVault' })
  assert.equal(classify('read', { file_path: 'c:\\users\\alice\\memoryvault\\notes.md' }, winSetup).station, 'memory')

  // Default vs overridden memoryServers & mnemon_* memoryLabels (full + short)
  const defaultSetup = createClassifySetup()
  assert.equal(defaultSetup.memoryServers.has('memory'), true)
  const overrideSetup = createClassifySetup({
    memoryServers: 'custom-mem',
    memoryLabels: 'mnemon_recall=mem recall,store=save mem',
  })
  assert.equal(overrideSetup.memoryServers.has('memory'), false)
  assert.equal(overrideSetup.memoryServers.has('custom-mem'), true)
  assert.equal(classify('mcp__memory__get_note', {}, overrideSetup).station, 'web')
  assert.equal(classify('mnemon_recall', { id: 7 }, overrideSetup).label, 'mem recall #7')
  assert.equal(classify('mnemon_store', {}, overrideSetup).label, 'save mem')

  // Complex shell nesting, 8000-char cap, and URL credential/backslash stripping
  assert.equal(classify('bash', { command: "find . -name '*.ts' -exec curl https://x.test {} +" }, setup).station, 'web')
  assert.equal(classify('bash', { command: 'docker exec mybox curl https://x.test' }, setup).station, 'web')
  assert.equal(classify('bash', { command: "bash -c 'curl https://x.test'" }, setup).station, 'web')
  assert.equal(classify('bash', { command: `cat ${'a'.repeat(8050)}` }, setup).station, 'shell')
  assert.equal(hostOf('https://user:secret@sub.example.com/a?token=1#frag'), 'sub.example.com')
  assert.equal(hostOf('https://a.example\\@b.example/'), 'a.example')
  console.log('[PASS] Classifier tests verified')
}

// 3. Session projection fold tests (full lifecycle, contextCost, Object.is stability)
{
  const def = createLotMapProjection({ hookRecords: true, hookReasons: true })
  let s = def.init({}, 0)
  const t0 = 1_700_000_000_000

  // Referential stability on ignored event
  const sIgnored = def.apply(s, { type: 'unknown/event', seq: 0, time: t0, data: {} })
  assert.equal(sIgnored, s)

  const events = [
    { type: 'request/context', seq: 1, time: t0 + 10, data: { provider: 'deepseek', model: 'deepseek-chat', contextWindow: 100_000 } },
    { type: 'user/message', seq: 2, time: t0 + 20, data: { source: { kind: 'user' }, content: [{ type: 'text', text: 'hello' }] } },
    { type: 'user/message', seq: 3, time: t0 + 25, data: { source: { kind: 'mnemon', form: 'recall' }, content: [{ type: 'text', text: 'Loaded [#12] [#48]' }] } },
    { type: 'step/start', seq: 4, time: t0 + 30, data: { turn: 1, step: 1 } },
    { type: 'assistant/message', seq: 5, time: t0 + 530, data: { turn: 1, step: 1, usage: { inputTokens: 10_000, outputTokens: 200 } } },
    { type: 'tool/call', seq: 6, time: t0 + 540, data: { turn: 1, step: 1, callId: 'c1', name: 'read', arguments: JSON.stringify({ file_path: 'src/app.ts' }) } },
    { type: 'tool/call', seq: 7, time: t0 + 545, data: { turn: 1, step: 1, callId: 'c2', name: 'bash', arguments: JSON.stringify({ command: 'rm -rf /', description: 'Clear build' }) } },
    { type: 'tool/result', seq: 8, time: t0 + 640, data: { turn: 1, step: 1, message: { source: { callId: 'c1' }, content: [{ type: 'text', text: 'ok' }] } } },
    { type: 'tool/result', seq: 9, time: t0 + 660, data: { turn: 1, step: 1, message: { source: { callId: 'c2' }, isError: true, content: [{ type: 'text', text: '[sandbox: file access denied]' }] }, error: { name: 'PolicyError', code: 'PERMISSION_DENIED', reason: 'Blocked: recursive delete' } } },
    { type: 'request/context', seq: 10, time: t0 + 670, data: { provider: 'google', model: 'gemini-4-neon', contextWindow: 100_000 } },
    { type: 'step/start', seq: 11, time: t0 + 680, data: { turn: 1, step: 2 } },
    { type: 'assistant/message', seq: 12, time: t0 + 1180, data: { turn: 1, step: 2, usage: { inputTokens: 24_000, outputTokens: 300 } } },
    { type: 'tool/call', seq: 13, time: t0 + 1190, data: { turn: 1, step: 2, callId: 'c3', name: 'subagent', arguments: JSON.stringify({ name: 'reviewer', description: 'Review diff' }) } },
    { type: 'subagent/catalog', seq: 14, time: t0 + 1200, data: { name: 'reviewer', childId: 'sub-1', version: 3, mode: 'continuable', label: 'Review diff', childCreatedAt: t0 } },
    { type: 'command/run', seq: 15, time: t0 + 1210, data: { name: 'lot-map', source: { kind: 'user' } } },
    { type: 'compaction/start', seq: 16, time: t0 + 1220, data: { compactionId: 'cmp-1', turn: null } },
    { type: 'compaction/end', seq: 17, time: t0 + 1320, data: { compactionId: 'cmp-1', turn: null } },
    { type: 'tool/result', seq: 18, time: t0 + 1400, data: { turn: 1, step: 2, message: { source: { callId: 'c3' }, content: [{ type: 'text', text: 'done' }] } } },
    { type: 'turn/end', seq: 19, time: t0 + 1500, data: { turn: 1, reason: { kind: 'completed' } } },
  ]

  // A child circles the Agents station exactly while its delegation call runs
  let mid = def.init({}, 0)
  for (const ev of events.slice(0, 5)) mid = def.apply(mid, ev)
  mid = def.apply(mid, { type: 'tool/call', seq: 90, time: t0 + 900, data: { turn: 1, step: 2, callId: 'cx', name: 'subagent', arguments: JSON.stringify({ name: 'checker' }) } })
  assert.deepEqual(def.wire.view(mid).agents, ['checker'])
  mid = def.apply(mid, { type: 'tool/result', seq: 91, time: t0 + 950, data: { turn: 1, step: 2, message: { source: { callId: 'cx' }, content: [{ type: 'text', text: 'ok' }] } } })
  assert.deepEqual(def.wire.view(mid).agents, [])
  // Durable membership alone never lights the Agents station
  const catalogOnly = def.apply(def.init({}, 0), { type: 'subagent/catalog', seq: 92, time: t0, data: { name: 'reviewer', childId: 'sub-1', version: 3, mode: 'continuable', label: 'x', childCreatedAt: t0 } })
  assert.equal(def.wire.view(catalogOnly).agents, undefined)

  for (const ev of events) {
    s = def.apply(s, ev)
    def.stateSchema.parse(s)
    def.wire.viewSchema.parse(def.wire.view(s))
  }

  const b = def.wire.view(s)
  assert.equal(b.model, 'gemini-4-neon')
  assert.equal(b.context, 24)
  assert.equal(b.pushed, 1)
  assert.equal(b.turns, 1)
  assert.equal(b.counts.you, 2) // newMessage + answerReady
  assert.equal(b.counts.memory, 1)
  assert.equal(b.counts.files, 2) // read + `rm -rf /` (rm is a FILE_WORD!)
  assert.equal(b.counts.hooks, 2) // memory hook + blocked refusal
  assert.equal(b.faults.hooks, 1)
  assert.equal(b.faults.files, 1)
  assert.equal(b.openRequestSeq, 1)
  assert.deepEqual(b.agents, []) // its delegation call answered before the turn ended
  assert.ok(b.entries.some((e) => e.mark === 'switch' && e.label === 'deepseek-chat → gemini-4-neon'))
  assert.ok(b.entries.some((e) => e.mark === 'done'))
  // contextCost attribution: step 2 grew from 10,000 -> 24,000 (+14,000 shared across 2 calls = +7,000 each)
  assert.equal(b.spent.files, 14000)

  // Standalone charged() check
  const sampleBoard = {
    entries: [{ id: 'a', station: 'files', label: 'a.ts', from: 'core', startedAt: 1, endedAt: 2, status: 'ok' }],
    counts: { files: 1 },
  }
  const cBoard = charged(sampleBoard, ['a'], 1000, 5000)
  assert.equal(cBoard.entries[0].tokens, 4000)
  assert.equal(cBoard.spent.files, 4000)

  // Session-start vs mid-session hooks, assistant/message model switch, you-tool faults, aborted turn, and background task lifecycle
  let p2 = def.init({}, 0)
  p2 = def.apply(p2, { type: 'user/message', seq: 1, time: t0 + 1, data: { source: { kind: 'mnemon', form: 'session-start' }, content: [{ type: 'text', text: '[#7]' }] } })
  assert.equal(def.wire.view(p2).entries[0].labelKey, 'addedMemoryAtStart')
  p2 = def.apply(p2, { type: 'user/message', seq: 2, time: t0 + 2, data: { source: { kind: 'user' }, content: [{ type: 'text', text: 'go' }] } })
  p2 = def.apply(p2, { type: 'user/message', seq: 3, time: t0 + 3, data: { source: { kind: 'system', form: 'notice' }, content: [{ type: 'text', text: 'ctx' }] } })
  assert.equal(def.wire.view(p2).entries.at(-1).labelKey, 'addedContextToMessage')
  p2 = def.apply(p2, { type: 'request/context', seq: 4, time: t0 + 4, data: { model: 'deepseek-chat', contextWindow: 100_000 } })
  p2 = def.apply(p2, { type: 'step/start', seq: 5, time: t0 + 5, data: { step: 1 } })
  p2 = def.apply(p2, { type: 'assistant/message', seq: 6, time: t0 + 6, data: { message: { source: { model: 'claude-opus-5-5' } }, usage: { inputTokens: 5000 } } })
  assert.ok(def.wire.view(p2).entries.some((e) => e.mark === 'switch' && e.label === 'deepseek-chat → opus 5.5'))
  assert.ok(def.wire.view(p2).switchedAt === t0 + 6)
  // Failed tool call on `you` station records a fault dot
  p2 = def.apply(p2, { type: 'tool/call', seq: 7, time: t0 + 7, data: { callId: 'cy', name: 'ask_user_question', arguments: '{}' } })
  p2 = def.apply(p2, { type: 'tool/result', seq: 8, time: t0 + 8, data: { message: { source: { callId: 'cy' }, isError: true, content: 'failed' } } })
  assert.equal(def.wire.view(p2).faults.you, 1)
  // Background task + aborted delegation call: aborted call closes as ok and clears non-bg agent, while bg task stays running
  p2 = def.apply(p2, { type: 'tool/call', seq: 9, time: t0 + 9, data: { callId: 'cbg', name: 'bash', arguments: JSON.stringify({ command: 'npm test', description: 'Run suite' }) } })
  p2 = def.apply(p2, { type: 'tool/result', seq: 10, time: t0 + 10, data: { status: 'async_launched', taskId: 'bg-1', message: { source: { callId: 'cbg' }, content: 'launched' } } })
  p2 = def.apply(p2, { type: 'tool/call', seq: 11, time: t0 + 11, data: { callId: 'cab', name: 'subagent', arguments: JSON.stringify({ name: 'ghost', description: 'Check' }) } })
  assert.deepEqual(def.wire.view(p2).agents, ['ghost'])
  p2 = def.apply(p2, { type: 'turn/end', seq: 12, time: t0 + 12, data: { reason: { kind: 'aborted' } } })
  assert.deepEqual(def.wire.view(p2).agents, [])
  assert.equal(def.wire.view(p2).entries.find((e) => e.id === 'tc-11').status, 'ok')
  assert.equal(def.wire.view(p2).entries.find((e) => e.id === 'tc-9').status, 'run')
  // Task notification settles bg-1 as err + adds fault without lighting You
  const youBefore = def.wire.view(p2).counts.you
  p2 = def.apply(p2, { type: 'user/message', seq: 13, time: t0 + 13, data: { source: { kind: 'task-notification' }, content: '<task-notification><task-id>bg-1</task-id><status>failed</status></task-notification>' } })
  assert.equal(def.wire.view(p2).entries.find((e) => e.id === 'tc-9').status, 'err')
  assert.equal(def.wire.view(p2).faults.shell, 1)
  assert.equal(def.wire.view(p2).counts.you, youBefore)
  assert.equal(def.wire.view(p2).turns, 1)

  // board.turns increments only on non-empty human/retry messages, never on memory/system/task notifications
  let tp = def.init({}, 0)
  assert.equal(def.wire.view(tp).turns, undefined)
  tp = def.apply(tp, { type: 'user/message', seq: 1, time: t0 + 1, data: { source: { kind: 'mnemon', form: 'session-start' }, content: [{ type: 'text', text: '[#1]' }] } })
  assert.equal(def.wire.view(tp).turns, undefined)
  tp = def.apply(tp, { type: 'user/message', seq: 2, time: t0 + 2, data: { source: { kind: 'user' }, content: [{ type: 'text', text: 'first turn' }] } })
  assert.equal(def.wire.view(tp).turns, 1)
  tp = def.apply(tp, { type: 'user/message', seq: 3, time: t0 + 3, data: { source: { kind: 'system', form: 'notice' }, content: [{ type: 'text', text: 'sys' }] } })
  tp = def.apply(tp, { type: 'user/message', seq: 4, time: t0 + 4, data: { source: { kind: 'task-notification' }, content: '<task-notification><task-id>bg-x</task-id><status>completed</status></task-notification>' } })
  const tpBeforeEmpty = tp
  tp = def.apply(tp, { type: 'user/message', seq: 5, time: t0 + 5, data: { source: { kind: 'user' }, content: [{ type: 'text', text: '   ' }] } })
  assert.equal(tp, tpBeforeEmpty)
  assert.equal(def.wire.view(tp).turns, 1)
  tp = def.apply(tp, { type: 'user/message', seq: 6, time: t0 + 6, data: { source: { kind: 'user' }, content: [{ type: 'text', text: 'second turn' }] } })
  assert.equal(def.wire.view(tp).turns, 2)
  tp = def.apply(tp, { type: 'user/message', seq: 7, time: t0 + 7, data: { source: { kind: 'retry' }, content: [{ type: 'text', text: 'retry turn' }] } })
  assert.equal(def.wire.view(tp).turns, 3)
  def.stateSchema.parse(tp)
  def.wire.viewSchema.parse(def.wire.view(tp))

  // Parallel same-name subagents keep separate orbiting dots and settle one by one
  let p3 = def.init({}, 0)
  p3 = def.apply(p3, { type: 'tool/call', seq: 1, time: t0 + 1, data: { callId: 'sa-1', name: 'subagent', arguments: JSON.stringify({ name: 'checker' }) } })
  p3 = def.apply(p3, { type: 'tool/call', seq: 2, time: t0 + 2, data: { callId: 'sa-2', name: 'subagent', arguments: JSON.stringify({ name: 'checker' }) } })
  assert.equal(def.wire.view(p3).agents.length, 2)
  p3 = def.apply(p3, { type: 'tool/result', seq: 3, time: t0 + 3, data: { message: { source: { callId: 'sa-1' }, content: 'ok' } } })
  assert.equal(def.wire.view(p3).agents.length, 1)
  p3 = def.apply(p3, { type: 'tool/result', seq: 4, time: t0 + 4, data: { message: { source: { callId: 'sa-2' }, content: 'ok' } } })
  assert.equal(def.wire.view(p3).agents.length, 0)

  // turn/end with reason.kind === 'error' marks lingering steps as err, records fault, and clears openCompactionId
  let p4 = def.init({}, 0)
  p4 = def.apply(p4, { type: 'step/start', seq: 1, time: t0 + 1, data: { step: 1 } })
  p4 = def.apply(p4, { type: 'compaction/start', seq: 2, time: t0 + 2, data: { compactionId: 'cmp-x' } })
  p4 = def.apply(p4, { type: 'turn/end', seq: 3, time: t0 + 3, data: { turn: 1, reason: { kind: 'error' } } })
  assert.equal(def.wire.view(p4).entries.find((e) => e.id === 'st-1').status, 'err')
  assert.equal(def.wire.view(p4).entries.find((e) => e.id === 'cmp-2').status, 'err')
  assert.equal(def.wire.view(p4).faults.model, 2)
  assert.equal(p4.openCompactionId, null)

  // Missing usage on assistant/message resets lastTokens so the next step does not overcharge
  let p5 = def.init({}, 0)
  p5 = def.apply(p5, { type: 'request/context', seq: 1, time: t0 + 1, data: { model: 'deepseek-chat', contextWindow: 100_000, autoCompactWindow: 80_000 } })
  p5 = def.apply(p5, { type: 'step/start', seq: 2, time: t0 + 2, data: { step: 1 } })
  p5 = def.apply(p5, { type: 'assistant/message', seq: 3, time: t0 + 3, data: { usage: { inputTokens: 10_000 } } })
  assert.equal(def.wire.view(p5).compactContext, 13)
  p5 = def.apply(p5, { type: 'tool/call', seq: 4, time: t0 + 4, data: { callId: 'u1', name: 'read', arguments: JSON.stringify({ file_path: 'a.ts' }) } })
  p5 = def.apply(p5, { type: 'step/start', seq: 5, time: t0 + 5, data: { step: 2 } })
  p5 = def.apply(p5, { type: 'assistant/message', seq: 6, time: t0 + 6, data: {} }) // missing usage
  assert.equal(p5.lastTokens, null)
  p5 = def.apply(p5, { type: 'tool/call', seq: 7, time: t0 + 7, data: { callId: 'u2', name: 'read', arguments: JSON.stringify({ file_path: 'b.ts' }) } })
  p5 = def.apply(p5, { type: 'step/start', seq: 8, time: t0 + 8, data: { step: 3 } })
  p5 = def.apply(p5, { type: 'assistant/message', seq: 9, time: t0 + 9, data: { usage: { inputTokens: 25_000 } } })
  assert.equal(def.wire.view(p5).spent?.files, undefined)
  console.log('[PASS] Session projection fold & contextCost verified')
}

// 4. Client module loading, SVG rendering, feed folding, and 2-language tests
{
  const clientCode = fs.readFileSync(path.join(root, 'client.js'), 'utf8')
  let registered = null
  const mockReact = {
    createElement: () => null,
    Fragment: Symbol('Fragment'),
    useState: (v) => [v, () => {}],
    useEffect: () => {},
    useMemo: (fn) => fn(),
    useRef: (v) => ({ current: v }),
    useCallback: (fn) => fn,
  }
  const sandbox = {
    window: {
      __ModuleLoader__: {
        load(mod) { registered = mod },
      },
    },
    console,
    Math,
    Date,
    Set,
    Map,
    Array,
    Object,
    String,
    Number,
    JSON,
    RegExp,
    Error,
  }
  vm.runInNewContext(clientCode, sandbox, { filename: 'client.js' })
  assert.equal(registered.id, 'dsh-lot-map')
  const plugin = registered.factory((name) => {
    assert.equal(name, 'react', 'client.js must only require react, never host UI packages')
    return mockReact
  })
  assert.deepEqual([...plugin.inject], ['slots', 'sidebarRightTabs', 'sidebarRight'])
  assert.equal(typeof plugin.apply, 'function')

  const {
    DARK,
    LIGHT,
    STATIONS,
    CSS_TEXT,
    drawMap,
    foldRows,
    buildFeedSections,
    nowParts,
    STRINGS,
    resolveSetup,
    resolvePalette,
    parseColors,
    parsePaneBackground,
    localizeLabel,
    classifyAutoOpen,
    shortModel: clientShortModel,
  } = plugin._internals
  assert.deepEqual(Object.keys(STRINGS), ['en', 'zh'])
  assert.equal('fitWidth' in STRINGS.en, false)
  assert.equal(clientShortModel('claude-sonnet-4-20250514'), shortModel('claude-sonnet-4-20250514'))
  assert.equal(STATIONS.length, 10)

  // DSH typography tokens, zero external fonts, dual theme & station focus CSS checks
  assert.ok(CSS_TEXT.includes('--dsw-font-family'))
  assert.ok(CSS_TEXT.includes('--ds-font-family-code'))
  assert.equal(/Geist|googleapis/i.test(CSS_TEXT), false)
  assert.equal(/Geist|googleapis/i.test(clientCode), false)
  assert.ok(CSS_TEXT.includes('.lm-pane[data-lm-theme="dark"]'))
  assert.ok(CSS_TEXT.includes('.lm-pane[data-lm-theme="light"]'))
  assert.ok(CSS_TEXT.includes('.lm-map-box[data-focus]'))

  // Distinct light/dark station colors and parseColors legacy + station overrides
  assert.notEqual(LIGHT.stations.files, DARK.stations.files)
  const parsedColors = parseColors('background=#123,node=#234,files=#4c8dff,station.web=#ff9a3c,memory=#00aa99')
  assert.equal(parsedColors.ground, '#112233')
  assert.equal(parsedColors.raised, '#223344')
  assert.equal(parsedColors.station_files, '#4c8dff')
  assert.equal(parsedColors.station_web, '#ff9a3c')
  assert.equal(parsedColors.mem, '#00aa99')
  const customPal = resolvePalette(resolveSetup({ theme: 'light', colors: 'files=#4c8dff,station.web=#ff9a3c' }, 'dark', 'zh'))
  assert.equal(customPal.stations.files, '#4c8dff')
  assert.equal(customPal.stations.web, '#ff9a3c')

  const now = 1_700_000_005_000
  const board = {
    model: 'gemini-4-neon',
    context: 92,
    pushed: 1,
    turns: 1,
    switchedAt: now - 1500,
    agents: ['reviewer', 'checker'],
    counts: { you: 1, model: 3, memory: 2, files: 4, shell: 1 },
    faults: { shell: 1 },
    spent: { files: 42000 },
    entries: [
      { id: '1', station: 'you', label: 'new message', labelKey: 'newMessage', from: 'inbound', startedAt: now - 5000, endedAt: now - 5000, status: 'ok' },
      { id: '2', station: 'memory', label: '2 records: #1 #2', from: 'inbound', startedAt: now - 4500, endedAt: now - 4500, status: 'ok' },
      { id: '3', station: 'files', label: 'src/a.ts', from: 'core', startedAt: now - 3000, endedAt: now - 2800, status: 'ok', tokens: 20000 },
      { id: '4', station: 'files', label: 'src/b.ts', from: 'core', startedAt: now - 2500, endedAt: now - 2200, status: 'ok', tokens: 22000 },
      { id: '5', station: 'files', label: 'src/c.ts', from: 'core', startedAt: now - 200, status: 'run' },
      { id: '6', station: 'files', label: 'src/d.ts', from: 'core', startedAt: now - 100, status: 'run' },
    ],
  }

  for (const lang of ['zh', 'en']) {
    for (const theme of ['dark', 'light']) {
      for (const layout of ['you-top', 'you-bottom']) {
        for (const motion of ['full', 'reduced']) {
          const setup = resolveSetup({
            language: lang,
            coreName: 'DSH',
            theme,
            layout,
            motion,
            contextCost: true,
            background: theme === 'dark' ? 'solid' : 'transparent',
            colors: '',
          }, theme, lang)
          const svg = drawMap(board, now, setup)
          assert.ok(svg.startsWith('<svg ') && svg.endsWith('</svg>'))
          assert.ok(svg.includes('viewBox="0 0 400 352"'))
          assert.ok(svg.includes('92%'))
          assert.ok(svg.includes('DSH'))
          assert.ok(svg.includes('gemini-4-neon'))
          assert.ok(svg.includes('×2'))
          assert.ok(svg.includes('↓1'))
          assert.ok(svg.includes('42k'))
          assert.equal(svg.includes('未使用') || svg.includes('Unused') || svg.includes('0 次'), false)
          for (const st of STATIONS) {
            assert.ok(svg.includes(`class="lm-st-node" data-station="${st.id}" role="button" tabindex="0"`), `missing station button ${st.id}`)
          }
          if (motion === 'reduced') {
            assert.ok(!svg.includes('<animateMotion'))
          } else {
            assert.ok(svg.includes('<animateMotion'))
          }
        }
      }
    }
  }

  // Negative clock skew still renders pulses when host clock is slightly ahead
  const skewedSvg = drawMap(board, now - 500, resolveSetup({ language: 'en', motion: 'full' }, 'dark', 'en'))
  assert.ok(skewedSvg.includes('<animateMotion'))

  // Model name moves to meter/title summary; coreName scales cleanly inside core circle
  assert.equal(clientShortModel('deepseek-v4.1-flash'), 'deepseek-v4.1-flash')
  const longModelSvg = drawMap({ ...board, model: 'deepseek-v4.1-flash' }, now, resolveSetup({ language: 'zh' }, 'dark', 'zh'))
  assert.ok(longModelSvg.includes('deepseek-v4.1-flash'))
  assert.ok(longModelSvg.includes('font-size="18"'))
  const longCoreSvg = drawMap(board, now, resolveSetup({ language: 'zh', coreName: 'LONG-CORE9' }, 'dark', 'zh'))
  assert.ok(longCoreSvg.includes('LONG-CORE9') && longCoreSvg.includes('font-size="7.5"'))

  // External labels avoid spokes/rings without stroke halo; solid vs transparent background controls SVG <rect> plate
  const transparentSvg = drawMap(board, now, resolveSetup({ language: 'zh', background: 'transparent', paneBackground: 'transparent' }, 'light', 'zh'))
  assert.equal(transparentSvg.includes('<rect width="400" height="352"'), false)
  assert.equal(transparentSvg.includes('paint-order="stroke"'), false)
  assert.ok(transparentSvg.includes('class="lm-st-label"'))
  const solidSvg = drawMap(board, now, resolveSetup({ language: 'zh', background: 'solid' }, 'dark', 'zh'))
  assert.ok(solidSvg.includes('<rect width="400" height="352" rx="12"'))

  // Feed folding check: entries 3 & 4 fold into one row with times=2 and tokens=42000
  const rows = foldRows(board.entries, 16)
  const foldedFiles = rows.find((r) => r.entry.id === '4')
  assert.equal(foldedFiles.times, 2)
  assert.equal(foldedFiles.tokens, 42000)

  // Held running task check when >16 distinct entries exist
  const manyEntries = [
    { id: 'old-run', station: 'shell', label: 'npm test', from: 'core', startedAt: now - 20000, status: 'run', task: 'bg-1' },
    ...Array.from({ length: 18 }, (_, i) => ({
      id: `ok-${i}`,
      station: i % 2 === 0 ? 'files' : 'web',
      label: `item-${i}`,
      from: 'core',
      startedAt: now - 10000 + i * 100,
      endedAt: now - 10000 + i * 100 + 50,
      status: 'ok',
    })),
  ]
  const heldFeed = foldRows(manyEntries, 16)
  assert.equal(heldFeed.some((r) => r.entry.id === 'old-run' && r.isHeld === true), true)

  // buildFeedSections: running/history split, turn grouping with board.turns + fallback, folding, truncation, station filter
  const feedEntries = [
    { id: 'init-1', station: 'memory', labelKey: 'addedMemoryAtStart', from: 'inbound', startedAt: now - 30000, endedAt: now - 30000, status: 'ok' },
    { id: 't1-u', station: 'you', label: 'new message', labelKey: 'newMessage', from: 'inbound', startedAt: now - 20000, endedAt: now - 20000, status: 'ok' },
    { id: 't1-f1', station: 'files', label: 'src/1.ts', from: 'core', startedAt: now - 19500, endedAt: now - 19200, status: 'ok', tokens: 1000 },
    { id: 't1-f2', station: 'files', label: 'src/2.ts', from: 'core', startedAt: now - 19000, endedAt: now - 18700, status: 'ok', tokens: 2000 },
    { id: 't1-end', station: 'you', label: 'turn interrupted', labelKey: 'turnAborted', from: 'core', startedAt: now - 18000, endedAt: now - 18000, status: 'err' },
    { id: 't2-u', station: 'you', label: 'new message', labelKey: 'newMessage', from: 'inbound', startedAt: now - 10000, endedAt: now - 10000, status: 'ok' },
    { id: 't2-sw', station: 'model', label: 'deepseek-chat → gemini-4-neon', from: 'core', startedAt: now - 9500, endedAt: now - 9500, status: 'ok', mark: 'switch' },
    { id: 't2-web', station: 'web', label: 'docs.example.com', from: 'core', startedAt: now - 9000, endedAt: now - 8500, status: 'err' },
    { id: 't2-f1', station: 'files', label: 'src/a.ts', from: 'core', startedAt: now - 8000, endedAt: now - 7800, status: 'ok', tokens: 3000 },
    { id: 't2-f2', station: 'files', label: 'src/b.ts', from: 'core', startedAt: now - 7600, endedAt: now - 7400, status: 'ok', tokens: 4000 },
    { id: 't2-end', station: 'you', label: 'answer ready', labelKey: 'answerReady', from: 'core', startedAt: now - 6000, endedAt: now - 6000, status: 'ok', mark: 'done' },
    { id: 'run-1', station: 'shell', label: 'npm test', from: 'core', startedAt: now - 3000, status: 'run', task: 'bg-1' },
    { id: 'run-2', station: 'files', label: 'src/c.ts', from: 'core', startedAt: now - 1000, status: 'run' },
  ]
  const sections = buildFeedSections(feedEntries, { totalTurns: 8, maxRows: 16 })
  assert.deepEqual([...sections.running.map((e) => e.id)], ['run-2', 'run-1'])
  assert.equal(sections.turns.length, 3)
  assert.equal(sections.turns[0].turnNo, 8)
  assert.equal(sections.turns[0].durationMs, 4000)
  assert.equal(sections.turns[0].rows.some((r) => r.entry.status === 'run'), false)
  assert.equal(sections.turns[0].rows.find((r) => r.entry.id === 't2-f2').times, 2)
  assert.equal(sections.turns[0].rows.find((r) => r.entry.id === 't2-f2').tokens, 7000)
  assert.equal(sections.turns[0].rows.some((r) => r.entry.id === 't2-sw' && r.entry.mark === 'switch'), true)
  assert.equal(sections.turns[1].turnNo, 7)
  assert.equal(sections.turns[1].durationMs, 2000)
  assert.equal(sections.turns[1].rows.find((r) => r.entry.id === 't1-f2').times, 2)
  assert.equal(sections.turns[2].turnNo, 6)
  assert.equal(sections.turns[2].isInit, false)

  const fallbackSections = buildFeedSections(feedEntries, { maxRows: 16 })
  assert.equal(fallbackSections.turns[0].turnNo, 2)
  assert.equal(fallbackSections.turns[1].turnNo, 1)
  assert.equal(fallbackSections.turns[2].isInit, true)

  const webOnly = buildFeedSections(feedEntries, { totalTurns: 8, maxRows: 16, filterStation: 'web' })
  assert.equal(webOnly.running.length, 0)
  assert.equal(webOnly.turns.length, 1)
  assert.equal(webOnly.turns[0].turnNo, 8)
  assert.equal(webOnly.turns[0].rows[0].entry.id, 't2-web')

  const filesOnly = buildFeedSections(feedEntries, { totalTurns: 8, maxRows: 16, filterStation: 'files' })
  assert.deepEqual([...filesOnly.running.map((e) => e.id)], ['run-2'])
  assert.deepEqual([...filesOnly.turns.map((t) => t.turnNo)], [8, 7])

  const capped = buildFeedSections(feedEntries, { totalTurns: 8, maxRows: 3 })
  assert.equal(capped.running.length, 2)
  assert.equal(capped.turns.reduce((sum, t) => sum + t.rows.length, 0), 3)

  // resolveSetup & localizeLabel checks (zh/en, paneBackground, contextWindow)
  assert.equal(parsePaneBackground('#abc'), '#aabbcc')
  assert.equal(parsePaneBackground('solid'), 'solid')
  assert.equal(parsePaneBackground('transparent'), 'transparent')
  assert.equal(parsePaneBackground('not-a-color'), 'theme')
  const sFallback = resolveSetup({ language: 'ru', paneBackground: '#123', contextWindow: 'compaction' }, 'dark', 'en-US')
  assert.equal(sFallback.langKey, 'en')
  assert.equal(sFallback.paneBackground, '#112233')
  assert.equal(sFallback.contextWindow, 'compaction')
  const zhSetup = resolveSetup({ language: 'auto' }, 'dark', 'zh-CN')
  assert.equal(zhSetup.langKey, 'zh')
  assert.equal(localizeLabel({ labelKey: 'addedContextAtStart' }, STRINGS.en), 'added context at session start')
  assert.equal(localizeLabel({ labelKey: 'addedMemoryAtStart' }, STRINGS.zh), '在会话开始时注入了记忆')

  const np = nowParts(board, zhSetup.t)
  assert.ok(np.what.includes('文件') && np.what.includes('src/d.ts'))

  // classifyAutoOpen: opens immediately on first message (even with mnemon + step/start burst), skips historical
  assert.equal(classifyAutoOpen(undefined, now), 'wait')
  assert.equal(classifyAutoOpen({ entries: [], counts: {} }, now), 'wait')
  assert.equal(classifyAutoOpen({
    turns: 1,
    entries: [
      { id: 'u1', station: 'you', from: 'inbound', startedAt: now - 50, endedAt: now - 50, status: 'ok' },
      { id: 'hk1', station: 'hooks', from: 'core', startedAt: now - 40, endedAt: now - 40, status: 'ok' },
      { id: 'm1', station: 'memory', from: 'inbound', startedAt: now - 40, endedAt: now - 40, status: 'ok' },
      { id: 'st1', station: 'model', from: 'core', startedAt: now - 10, status: 'run' },
    ],
  }, now), 'open')
  assert.equal(classifyAutoOpen({
    turns: 2,
    entries: [
      { id: 'u1', station: 'you', from: 'inbound', startedAt: now - 2000, endedAt: now - 2000, status: 'ok' },
      { id: 'u2', station: 'you', from: 'inbound', startedAt: now - 10, endedAt: now - 10, status: 'ok' },
    ],
  }, now), 'skip')
  assert.equal(classifyAutoOpen({
    turns: 1,
    entries: [
      { id: 'u1', station: 'you', from: 'inbound', startedAt: now - 500, endedAt: now - 500, status: 'ok' },
      { id: 'done1', station: 'you', from: 'core', startedAt: now - 100, endedAt: now - 100, status: 'ok', mark: 'done' },
    ],
  }, now), 'skip')
  assert.equal(classifyAutoOpen({
    turns: 1,
    entries: [
      { id: 'u1', station: 'you', from: 'inbound', startedAt: now - 20_000, endedAt: now - 20_000, status: 'ok' },
    ],
  }, now), 'skip')
  assert.equal(classifyAutoOpen({
    entries: Array.from({ length: 7 }, (_, i) => ({
      id: `e-${i}`,
      station: 'files',
      from: 'core',
      startedAt: now - 100,
      endedAt: now - 100,
      status: 'ok',
    })),
  }, now), 'skip')
  assert.equal(clientCode.includes('[sessionId, env.prefs.openAtStart, entries.length]'), false)

  console.log('[PASS] Client module, drawMap SVG (2 languages × themes × layouts × motion), and feed folding verified')
}

console.log('\nALL VERIFICATION CHECKS PASSED.')
