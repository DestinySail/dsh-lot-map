// Which station an action belongs to and what to call it: a name, never content.
// Ported 1:1 from alexeyw/lot-map (MIT) and extended for DeepSeek Harness native tools.

const slashes = (path) => path.replace(/\\/g, '/')
const lastTwo = (path) => slashes(path).split('/').filter(Boolean).slice(-2).join('/')
const HOST = /^(?:[\p{L}\p{N}.-]+|\[[0-9a-f:.]+\])(?::\d+)?$/iu

export function hostOf(url) {
  const [, special = '', other = '', rest = ''] = /^(?:(https?|wss?|ftp):[/\\]*|([a-z][a-z0-9+.-]*):\/\/)?(.*)$/is.exec(url) ?? []
  const scheme = special || other
  const end = rest.search(/[/?#\\]/)
  const first = end < 0 ? rest : rest.slice(0, end)
  const beyond = end < 0 ? '' : rest.slice(end)
  let host = first.split('@').pop() ?? ''
  if (!first.startsWith('[') && !first.includes('@') && first.includes(':') && beyond.includes('@')) {
    host = /:\d+$/.test(first) ? '' : (rest.slice(rest.lastIndexOf('@') + 1).split(/[/?#\\]/)[0] ?? '')
  }
  return HOST.test(host) ? host.slice(0, 40) : scheme
}

export function cut(text, max) {
  if (text.length <= max) return text
  const all = [...text]
  return all.length > max ? `${all.slice(0, max - 1).join('')}…` : text
}

export function clean(label, max = 120) {
  if (typeof label !== 'string') return ''
  const text = label.replace(/(?:(?![\u200c\u200d])[\p{Cc}\p{Cf}\p{Zl}\p{Zp}])+/gu, ' ').replace(/ {2,}/g, ' ').trim()
  return cut(text, max)
}

const isMemoryPath = (path, setup) => {
  const p = slashes(path)
  const lower = p.toLowerCase()
  if (/\/\.claude\/projects\/[^/]+\/memory\//i.test(p)) return true
  if (/(?:^|\/)(?:\.dsh|\.claude|deepseek-harness)\/(?:.*memory|(?:MEMORY|USER)\.md$)/i.test(p)) return true
  if (/(?:^|\/)MEMORY\.md$/i.test(p)) return true
  return setup.memoryPaths.some((part) => lower.includes(slashes(part).toLowerCase()))
}

const str = (v) => (typeof v === 'string' ? v : '')

const FILE_WORDS = new Set([
  'cat', 'head', 'tail', 'sed', 'grep', 'rg', 'find', 'ls', 'wc', 'cp', 'mv',
  'mkdir', 'touch', 'diff', 'cmp', 'sort', 'uniq', 'cut', 'tr', 'awk', 'tee',
  'stat', 'file', 'du', 'tree', 'ln', 'basename', 'dirname', 'realpath', 'jq',
  'rm', 'rmdir',
])

const NEUTRAL_WORDS = new Set([
  'echo', 'printf', 'cd', 'export', 'true', 'false', ':', 'set', 'pwd', 'sleep',
  'which', 'test', '[', '[[', 'read', 'local', 'declare', 'typeset', 'readonly',
  'unset', 'shopt', 'umask', 'pushd', 'popd', 'wait',
])

const NET_WORDS = new Set([
  'curl', 'wget', 'gh', 'ssh', 'scp', 'sftp', 'ftp', 'rsync', 'nc', 'ncat',
  'telnet', 'ping', 'dig', 'nslookup', 'nmap', 'http', 'https', 'kubectl',
  'aws', 'gcloud', 'az', 'uvx',
])

const NET_SUBCOMMANDS = {
  git: new Set(['push', 'pull', 'fetch', 'clone', 'ls-remote', 'submodule update', 'remote update']),
  svn: new Set(['checkout', 'co', 'update', 'up', 'commit', 'ci', 'export']),
  hg: new Set(['clone', 'pull', 'push', 'incoming', 'outgoing']),
  npm: new Set(['install', 'i', 'ci', 'add', 'update', 'publish', 'view', 'audit', 'exec', 'x']),
  pnpm: new Set(['install', 'i', 'add', 'update', 'publish', 'dlx']),
  yarn: new Set(['install', 'add', 'upgrade', 'publish', 'dlx']),
  bun: new Set(['install', 'i', 'add', 'update', 'publish', 'x']),
  pip: new Set(['install', 'download']),
  pipx: new Set(['install', 'upgrade', 'upgrade-all', 'run']),
  uv: new Set(['add', 'sync', 'lock', 'publish', 'tool install', 'tool run']),
  poetry: new Set(['install', 'add', 'update', 'lock', 'publish']),
  docker: new Set(['pull', 'push', 'login']),
  'docker compose': new Set(['pull', 'push']),
  brew: new Set(['install', 'update', 'upgrade', 'fetch']),
  cargo: new Set(['install', 'fetch', 'publish', 'update']),
  go: new Set(['get', 'install', 'mod download']),
  apt: new Set(['install', 'update', 'upgrade', 'full-upgrade', 'dist-upgrade']),
  'apt-get': new Set(['install', 'update', 'upgrade', 'dist-upgrade']),
  deno: new Set(['install', 'add', 'cache']),
  terraform: new Set(['init', 'plan', 'apply', 'destroy', 'import', 'refresh']),
  helm: new Set(['install', 'upgrade', 'pull', 'push', 'repo', 'search', 'dependency']),
  openssl: new Set(['s_client']),
  claude: new Set(['update', 'install', 'plugin install', 'plugin update', 'plugin marketplace add', 'plugin marketplace update']),
}

const PY_MODULES = new Set(['pip', 'uv', 'pipx', 'poetry'])

const WRAPPERS = {
  sudo: { takes: ['-u', '-g', '-p', '-h', '-C', '-D', '-R', '-T', '-U', '-r', '-t', '--user', '--group', '--prompt', '--host', '--close-from', '--chdir', '--chroot', '--command-timeout', '--other-user', '--role', '--type'] },
  doas: { takes: ['-u', '-C'] },
  env: { takes: ['-u', '-C', '--unset', '--chdir'] },
  time: {},
  timeout: { takes: ['-s', '-k', '--signal', '--kill-after'], skip: 1 },
  nohup: {},
  nice: { takes: ['-n', '--adjustment'] },
  ionice: { takes: ['-c', '-n'] },
  stdbuf: { takes: ['-i', '-o', '-e'] },
  caffeinate: { takes: ['-t', '-w'] },
  command: { asks: ['-v', '-V'] },
  exec: { takes: ['-a'] },
  xargs: { takes: ['-n', '-I', '-P', '-L', '-d', '-E', '-s', '-a', '-J', '-R'] },
  watch: { takes: ['-n', '--interval'] },
}

const ASSIGNMENT = /^[A-Za-z_]\w*(?:\[[^\]]*\])?\+?=/
const REDIRECTION = /^(?:\d+|&)?(?:>>|>\||<<<|<<-|<<|<>|>&|<&|>|<)/

function start(words, from = 0) {
  let i = from
  for (;;) {
    const word = words[i] ?? ''
    const sent = REDIRECTION.exec(word)
    if (ASSIGNMENT.test(word)) i++
    else if (sent !== null) i += word.length === sent[0].length ? 2 : 1
    else return Math.min(i, words.length)
  }
}

const GIT_TAKES = new Set(['-C', '-c', '--git-dir', '--work-tree', '--namespace', '--exec-path', '--config-env'])
const DOCKER_TAKES = new Set(['-c', '--context', '-H', '--host', '--config', '-l', '--log-level', '-f', '--file', '-p', '--project-name', '--profile', '--env-file', '--project-directory'])

const pastFlags = (words, takes) => {
  let i = 0
  while (i < words.length && (words[i] ?? '').startsWith('-')) i += takes.has(words[i] ?? '') ? 2 : 1
  return words.slice(i)
}

function splitString(words, takes) {
  for (let i = 1; i < words.length && (words[i] ?? '').startsWith('-'); i++) {
    const word = words[i] ?? ''
    if (takes.includes(word)) {
      i++
      continue
    }
    const m = /^--split-string(?:=([^]*))?$/.exec(word) ?? /^-[A-Za-z0-9]*?S([^]*)$/.exec(word.startsWith('--') ? '' : word)
    if (m === null) continue
    const value = m[1] !== undefined && m[1] !== '' ? m[1] : (words[++i] ?? '')
    return [...unquoted(value).trim().split(/\s+/).filter((w) => w !== ''), ...words.slice(i + 1)]
  }
  return undefined
}

function unwrapped(words, name) {
  let rest = words
  for (let depth = 0; depth < 6; depth++) {
    const wrapper = WRAPPERS[name(rest[0])]
    if (wrapper === undefined) break
    const handed = name(rest[0]) === 'env' ? splitString(rest, wrapper.takes ?? []) : undefined
    if (handed !== undefined) {
      rest = handed.slice(start(handed))
      continue
    }
    if (wrapper.asks?.some((flag) => rest[1] === flag) === true) break
    rest = pastFlags(rest.slice(1), new Set(wrapper.takes ?? []))
    rest = rest.slice(start(rest) + (wrapper.skip ?? 0))
  }
  return rest
}

const DOCKER_ALONE = new Set([
  '-i', '-t', '-d', '-P', '-q', '-T', '--interactive', '--tty', '--detach', '--rm',
  '--init', '--privileged', '--publish-all', '--read-only', '--no-healthcheck',
  '--oom-kill-disable', '--quiet', '--no-deps', '--build', '--service-ports',
  '--use-aliases', '--no-TTY', '--remove-orphans', '--quiet-pull',
])

function insideContainer(words) {
  let i = 0
  while (i < words.length && (words[i] ?? '').startsWith('-')) {
    const flag = words[i] ?? ''
    i += DOCKER_ALONE.has(flag) || flag.includes('=') || /^-[itdqPT]{2,}$/.test(flag) ? 1 : 2
  }
  return words.slice(i + 1)
}

const RUNNERS = new Set(['python', 'python3', 'bash', 'sh', 'zsh', 'node'])
const SHELLS = new Set(['bash', 'sh', 'zsh', 'dash', 'ksh'])
const BEFORE_A_COMMAND = new Set(['do', 'then', 'else', 'elif', 'if', 'while', 'until', '!', '{'])
const NO_COMMAND = new Set(['for', 'select', 'case', 'function', 'done', 'fi', 'esac', '}'])

const COMMON_WORDS = new Set([
  'bunx', 'pwsh', 'powershell', 'make', 'cmake', 'ninja', 'gradle', 'gradlew', 'mvn', 'ant', 'bazel',
  'npx', 'tsc', 'vite', 'jest', 'vitest', 'eslint', 'prettier', 'pytest', 'tox', 'ruff', 'mypy',
  'black', 'rustc', 'gcc', 'clang', 'java', 'javac', 'kotlinc', 'swift', 'swiftc', 'xcodebuild',
  'dotnet', 'ruby', 'perl', 'php', 'lua', 'Rscript', 'claude', 'code', 'open', 'ps', 'kill', 'pkill',
  'date', 'chmod', 'chown', 'tar', 'zip', 'unzip', 'gzip', 'gunzip', 'xz', 'sqlite3', 'psql', 'mysql',
  'redis-cli', 'ffmpeg', 'ffprobe', 'magick', 'pandoc', 'man', 'less', 'more', 'history', 'uname',
  'whoami', 'id', 'hostname', 'df', 'free', 'top', 'lsof', 'launchctl', 'systemctl', 'journalctl',
  'crontab', 'adb', 'emulator', 'xcrun', 'pod', 'flutter', 'dart', 'bundle', 'rake', 'gem', 'composer',
  'tmux', 'screen', 'source', 'eval', 'trap', 'alias', 'type', 'hash', 'jobs', 'fg', 'bg', 'exit',
  'return', 'shift', 'getopts', 'ulimit', 'seq', 'yes', 'xxd', 'od', 'base64', 'shasum', 'sha256sum',
  'md5', 'md5sum', 'openssl', 'gpg', 'patch', 'column', 'paste', 'join', 'comm', 'fold', 'nl', 'rev',
  'tac', 'split', 'expr', 'bc', 'envsubst', 'mktemp', 'pbcopy', 'pbpaste', 'osascript', 'defaults',
  'say', 'node', 'deno', 'bun', 'dsh',
])

const KNOWN_WORDS = new Set([
  ...FILE_WORDS, ...NEUTRAL_WORDS, ...NET_WORDS,
  ...Object.keys(NET_SUBCOMMANDS), ...Object.keys(WRAPPERS),
  ...RUNNERS, ...SHELLS, ...COMMON_WORDS,
])

const READ = 8000
const FOLLOWED = 256

const unquoted = (word) => {
  const q = word[0]
  if (q !== '"' && q !== "'") return word
  const inner = word.length > 1 && word.endsWith(q) ? word.slice(1, -1) : word.slice(1)
  return q === '"' ? inner.replace(/\\(["\\$`])/g, '$1') : inner
}

const HERE_MARK = /<<(-?)[ \t]*((?:"[^"\n]*"|'[^'\n]*'|\\[^\n]|[^\s;&|<>()"'\\`])+)/y
const markOf = (written) => written.replace(/'([^']*)'|"([^"]*)"|\\(.)/g, '$1$2$3')

function closing(text, from, depth = 0) {
  let open = 1
  let cases = 0
  for (let i = from; i < text.length; i++) {
    const c = text[i]
    if (c === '\\') i++
    else if (c === "'" || c === '`') {
      let end = i + 1
      while (end < text.length && text[end] !== c) end += c === '`' && text[end] === '\\' ? 2 : 1
      i = end
    } else if (c === '"') {
      for (i++; i < text.length && text[i] !== '"'; i++) {
        if (text[i] === '\\') i++
        else if (text[i] === '$' && text[i + 1] === '(' && depth < 16) i = closing(text, i + 2, depth + 1)
      }
    } else if (c === '#' && /[\s;|&(]/.test(text[i - 1] ?? ' ')) {
      const end = text.indexOf('\n', i)
      i = end < 0 ? text.length : end
    } else if (c === '(') open++
    else if (c === ')') {
      if (open === 1 && cases > 0) continue
      if (--open === 0) return i
    } else if ((c === 'c' || c === 'e') && /[\s;|&(]/.test(text[i - 1] ?? ' ')) {
      const word = /^(?:case|esac)(?![\w-])/.exec(text.slice(i, i + 5))?.[0]
      if (word === 'case') cases++
      else if (word === 'esac' && cases > 0) cases--
      if (word !== undefined) i += 3
    }
  }
  return text.length
}

function expanded(text) {
  const found = []
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (c === '\\') i++
    else if (c === '`') {
      let end = i + 1
      while (end < text.length && text[end] !== '`') end += text[end] === '\\' ? 2 : 1
      found.push(text.slice(i + 1, end))
      i = end
    } else if (c === '$' && text[i + 1] === '(' && text[i + 2] !== '(') {
      const end = closing(text, i + 2)
      found.push(text.slice(i + 2, end))
      i = end
    }
  }
  return found
}

function withoutHereDocuments(command, cutState) {
  if (!command.includes('<<')) return command
  const kept = []
  const waiting = []
  const expand = (text) => {
    if (text.length === 0) return
    for (const inner of expanded(text.join('\n'))) {
      if (size >= READ) break
      kept.push(inner)
      size += inner.length + 1
    }
  }
  const marksAt = []
  const opened = []
  const nested = []
  const sums = []
  let size = 0
  let joined = false
  for (const line of command.split('\n')) {
    const open = waiting[0]
    if (open !== undefined && !joined) {
      const text = (open.tabs ? line.replace(/^\t+/, '') : line).replace(/\r$/, '')
      if (text === open.word) expand(waiting.shift()?.text ?? [])
      else if (open.isRun) {
        kept.push(line)
        size += line.length + 1
      } else if (open.isBare && size < READ && (open.text.length > 0 || line.includes('$(') || line.includes('`'))) open.text.push(line)
      continue
    }
    if (size >= READ) {
      if (cutState !== undefined) cutState.short = true
      break
    }
    kept.push(line)
    joined = opened[opened.length - 1] !== "'" && /(?:^|[^\\])(?:\\\\)*\\$/.test(line)
    let from = 0
    let isRun
    const room = Math.min(line.length, READ - size)
    for (let i = 0; i < room; i++) {
      const c = line[i]
      const quote = opened[opened.length - 1]
      if (quote === "'") {
        if (c === "'") opened.pop()
      } else if (c === '\\') i++
      else if (quote === '$') {
        if (c === "'") opened.pop()
      } else if (quote === '"') {
        if (c === '"') opened.pop()
        else if (c === '`' || (c === '$' && line[i + 1] === '(')) {
          opened.push(c === '`' ? '`' : ')')
          if (c === '`') marksAt.push(waiting.length)
          if (c === '$') {
            nested.push(0)
            sums.push(line[i + 2] === '(')
            i++
          }
          from = i + 1
          isRun = undefined
        }
      } else if (c === '"' || c === "'") opened.push(c)
      else if (c === '$' && line[i + 1] === "'") {
        opened.push('$')
        i++
      } else if (c === '#' && (i === 0 || /[\s;|&(]/.test(line[i - 1] ?? ''))) break
      else if (c === '`') {
        if (quote === '`') {
          opened.pop()
          waiting.length = Math.min(waiting.length, marksAt.pop() ?? 0)
        } else {
          opened.push('`')
          marksAt.push(waiting.length)
          from = i + 1
          isRun = undefined
        }
      } else if (quote === ')' && c === '(') nested[nested.length - 1] = (nested[nested.length - 1] ?? 0) + 1
      else if (quote === ')' && c === ')') {
        if ((nested[nested.length - 1] ?? 0) > 0) nested[nested.length - 1] = (nested[nested.length - 1] ?? 0) - 1
        else {
          opened.pop()
          nested.pop()
          sums.pop()
        }
      } else if (c === ';' || (c === '|' && line[i - 1] !== '>') || (c === '&' && line[i + 1] !== '>' && !/[<>]/.test(line[i - 1] ?? ''))) {
        from = i + 1
        isRun = undefined
      } else if (c === '<' && line[i + 1] === '<') {
        if (line[i + 2] === '<') {
          i += 2
          continue
        }
        HERE_MARK.lastIndex = i
        const m = HERE_MARK.exec(line)
        const before = line.slice(from, i)
        if (m === null || (quote === ')' && sums[sums.length - 1] === true) || before.lastIndexOf('((') > before.lastIndexOf('))') || before.lastIndexOf('$[') > before.lastIndexOf(']')) {
          i++
          continue
        }
        if (isRun === undefined) {
          const feeds = unwrapped(segments(before).pop() ?? [], base)
          const given = feeds.slice(1).filter((w, n, all) => {
            const sent = REDIRECTION.exec(w)
            const target = REDIRECTION.exec(all[n - 1] ?? '')
            return sent === null && !(target !== null && target[0].length === (all[n - 1] ?? '').length)
          })
          isRun = SHELLS.has(base(feeds[0])) && given.every((w) => w.startsWith('-') && !/^-[a-z]*c$/.test(w))
        }
        waiting.push({ word: markOf(m[2] ?? ''), tabs: m[1] === '-', isRun, isBare: !/["'\\]/.test(m[2] ?? ''), text: [] })
        i = HERE_MARK.lastIndex - 1
      }
    }
    size += line.length + 1
  }
  for (const open of waiting) expand(open.text)
  return kept.join('\n')
}

const PS_FILE_WORDS = new Set([
  'get-content', 'gc', 'type', 'set-content', 'add-content', 'out-file', 'get-childitem',
  'gci', 'dir', 'get-item', 'gi', 'select-string', 'sls', 'copy-item', 'cpi', 'copy',
  'move-item', 'mi', 'move', 'rename-item', 'rni', 'ren', 'new-item', 'ni', 'md',
  'test-path', 'resolve-path', 'get-filehash',
])

const PS_NEUTRAL_WORDS = new Set([
  'write-host', 'write-output', 'set-location', 'sl', 'get-location', 'gl', 'start-sleep',
  'select-object', 'select', 'where-object', 'where', '?', 'foreach-object', 'foreach', '%',
  'sort-object', 'measure-object', 'measure', 'format-table', 'ft', 'format-list', 'fl',
  'out-string', 'out-null', 'catch',
])

const PS_NET_WORDS = new Set([
  'invoke-webrequest', 'iwr', 'invoke-restmethod', 'irm', 'test-connection',
  'test-netconnection', 'resolve-dnsname', 'start-bitstransfer',
])

const PS_COMMON_WORDS = new Set([
  'get-process', 'stop-process', 'start-process', 'get-date', 'get-command', 'get-help',
  'get-member', 'get-service', 'get-variable', 'set-variable', 'remove-item', 'ri', 'del',
  'rd', 'rmdir', 'clear-host', 'cls', 'convertto-json', 'convertfrom-json', 'convertto-csv',
  'convertfrom-csv', 'import-csv', 'export-csv', 'import-module', 'join-path', 'split-path',
  'compare-object', 'group-object', 'tee-object', 'new-object', 'write-error', 'write-warning',
  'write-verbose', 'out-host', 'invoke-expression', 'iex', 'invoke-command', 'start-job',
  'get-job', 'receive-job', 'wait-job', 'expand-archive', 'compress-archive', 'pwsh',
  'powershell', 'cmd',
])

const PS_KNOWN_WORDS = new Set([...PS_FILE_WORDS, ...PS_NEUTRAL_WORDS, ...PS_NET_WORDS, ...PS_COMMON_WORDS])

const BEFORE_AN_ARRAY = /(?:^|[\s;&|({])[A-Za-z_]\w*\+?=$/
const ARRAY_NAME_ROOM = 120

function pieces(line, deep, powershell, ends) {
  const out = []
  const open = [{ text: '', quote: '', close: '' }]
  const escape = powershell ? '`' : '\\'
  const cutPiece = (reading, mark = '') => {
    out.push(reading.text)
    ends?.push(mark)
    reading.text = ''
  }
  let glued = false
  for (let i = 0; i < line.length; i++) {
    const top = open[open.length - 1]
    const c = line[i] ?? ''
    const next = line[i + 1] ?? ''
    const wasGlued = glued
    glued = false
    if (top.quote === "'") {
      top.text += c
      if (c === "'") top.quote = ''
      continue
    }
    if (deep && !powershell && c === '\\' && next === '`' && open.some((reading) => reading.close === '`')) {
      cutPiece(top)
      glued = true
      i++
      continue
    }
    if (c === '\\' && next === '\n' && !powershell) {
      top.text += ' '
      i++
      continue
    }
    if (c === escape || (c === '\\' && top.quote === '$')) {
      top.text += c + next
      glued = true
      i++
      continue
    }
    const inside = deep && c === '$' && next === '(' ? ')' : deep && c === '`' && !powershell && top.close !== '`' ? '`' : ''
    if (top.quote !== '') {
      if ((top.quote === '$' && c === "'") || (top.quote === '"' && c === '"')) top.quote = ''
      if (top.quote === '"' && inside !== '') {
        open.push({ text: '', quote: '', close: inside })
        if (inside === ')') i++
        top.text += ' '
      } else top.text += c
      continue
    }
    if (c === '"' || c === "'") {
      top.quote = c
      top.text += c
    } else if (c === '$' && next === "'" && !powershell) {
      top.quote = '$'
      top.text += "$'"
      i++
    } else if (c === '#' && !wasGlued && /^$|\s$/.test(top.text.slice(-1))) {
      while (i + 1 < line.length && line[i + 1] !== '\n') i++
    } else if (top.array !== undefined && c === '\n') top.text += ' '
    else if (top.array !== undefined && inside === '' && c === '(' && !deep) top.array++
    else if (top.array !== undefined && c === ')' && top.array > 0) top.array--
    else if (top.array !== undefined && c === ')') {
      if (deep) cutPiece(top)
      open.pop()
      open[open.length - 1].text += ' '
    } else if (top.array !== undefined && (c === ';' || c === '|' || c === '&')) {
      open.pop()
      open[open.length - 1].text += `(${top.text}`
      i--
    } else if (c === '(' && inside === '' && !powershell && top.text.endsWith('=') && BEFORE_AN_ARRAY.test(top.text.slice(-ARRAY_NAME_ROOM))) {
      open.push({ text: '', quote: '', close: ')', array: 0 })
    } else if (c === '\n' || c === ';' || (c === '|' && line[i - 1] !== '>')) cutPiece(top, c)
    else if (c === '&' && (next === '&' || !powershell)) {
      if (next !== '&' && (next === '>' || /[<>]/.test(line[i - 1] ?? ''))) top.text += c
      else cutPiece(top, c)
    } else if (inside !== '' || (powershell && c === '{' && line[i - 1] !== '@' && line[i - 1] !== '$') || (deep && c === '(')) {
      if (powershell && c === '{' && !deep) cutPiece(top)
      open.push({ text: '', quote: '', close: inside === '`' ? '`' : c === '{' ? '}' : ')' })
      if (inside === ')') i++
      top.text += ' '
    } else if ((powershell && c === '}' && top.close === '}') || (deep && (c === ')' || (c === '`' && !powershell)))) {
      cutPiece(top)
      glued = true
      if (top.close === c && open.length > 1) open.pop()
    } else top.text += c
  }
  for (let n = open.length - 1; n > 0; n--) {
    const reading = open[n]
    if (reading.array === undefined) continue
    open[n - 1].text += `(${reading.text}`
    open.splice(n, 1)
  }
  for (const reading of open) out.push(reading.text)
  return out
}

const WORDS = /(?:\\[\s\S]|[^\s"'\\]|"(?:[^"\\]|\\[\s\S])*"?|'[^']*'?)+/g
const PS_WORDS = /(?:[^\s"']|"[^"]*"?|'[^']*'?)+/g

const closedBy = (word) => {
  if (!word.endsWith(')')) return 0
  const bare = word.replace(/\\[\s\S]|"(?:[^"\\]|\\[\s\S])*"?|'[^']*'?/g, '_')
  let last = 0
  while (last < bare.length && bare[bare.length - 1 - last] === ')') last++
  return Math.max(0, Math.min(last, bare.split(')').length - bare.split('(').length))
}
const closesMore = (word) => closedBy(word) > 0

function segments(command, deep = false, constructs = false, powershell = false) {
  let subshells = 0
  let cases = 0
  let pattern = false
  const ends = []
  const follow = constructs && !deep
  const parts = pieces(command, deep, powershell, follow ? ends : undefined)
  const commandOf = (words, end) => {
    let at = 0
    let first
    for (;;) {
      const head = first ?? words[at] ?? ''
      if (BEFORE_A_COMMAND.has(head)) [at, first] = [start(words, at + 1), undefined]
      else if (head === 'function' && words.length - at > 2) [at, first] = [at + (words[at + 2] === '()' ? 3 : 2), undefined]
      else if (/^[A-Za-z_][\w.-]*\(\)$/.test(head) && words[at + 1] === '{') [at, first] = [at + 1, undefined]
      else if (/^[A-Za-z_][\w.-]*$/.test(head) && words[at + 1] === '()' && words[at + 2] === '{') [at, first] = [at + 2, undefined]
      else if (head.startsWith('(') && !head.startsWith('((')) {
        subshells++
        if (head.length > 1) first = head.slice(1)
        else [at, first] = [at + 1, undefined]
      } else break
    }
    let rest = first === undefined ? words.slice(at) : [first, ...words.slice(at + 1)]
    const head = rest[0] ?? ''
    if (follow && head === 'case') {
      cases++
      pattern = true
      const idx = rest.indexOf('in')
      return idx < 0 ? [] : patternThen(rest.slice(idx + 1), end)
    }
    if (follow && cases > 0 && head === 'esac') cases--
    rest = rest.flatMap((word) => {
      const off = subshells > 0 ? Math.min(subshells, closedBy(word)) : 0
      subshells -= off
      const w = off > 0 ? word.slice(0, -off) : word
      return w === '' ? [] : [w]
    })
    return NO_COMMAND.has(rest[0] ?? '') ? [] : rest
  }
  const patternThen = (words, end) => {
    const rest = words[0] === 'in' ? words.slice(1) : words
    if (rest.length === 0) return []
    if (rest[0] === 'esac') {
      pattern = false
      return commandOf(rest, end)
    }
    const first = rest[0] ?? ''
    const own = first.startsWith('(') ? [first.slice(1), ...rest.slice(1)] : rest
    const close = own.findIndex(closesMore)
    if (close < 0 && end === '|') return []
    pattern = false
    return commandOf(close < 0 ? rest : own.slice(close + 1), end)
  }
  return parts
    .map((part, n) => {
      const words = part.match(powershell ? PS_WORDS : WORDS) ?? []
      const i = start(words)
      if (!constructs) return words.slice(i)
      if (follow && cases > 0) {
        if (words.length === 0 && n > 0 && ends[n - 1] === ';' && (ends[n] === ';' || ends[n] === '&')) pattern = true
        if (pattern) return patternThen(words.slice(i), ends[n] ?? '')
      }
      return commandOf(words.slice(i), ends[n] ?? '')
    })
    .filter((words) => words.length > 0)
}

const base = (word = '') => {
  const name = slashes(word.replace(/["']/g, '')).split('/').pop() ?? word
  return /\.(?:exe|cmd|bat)$/i.test(name) ? name.replace(/\.(?:exe|cmd|bat)$/i, '').toLowerCase() : name
}

const stem = (name) => name.replace(/\.[a-z0-9]+$/i, '')

const named = (name, command) => {
  const s = stem(name)
  return s === command || (s.startsWith(command) && /^[-_.]/.test(s.slice(command.length)))
}

function memoryLabel(words, setup) {
  const head = base(words[0])
  if (!setup.memoryCommands.includes(head)) return stem(base(RUNNERS.has(head) && words[1] ? words[1] : words[0]))
  const sub = words[1] ?? ''
  return setup.memorySubcommands.has(sub) ? sub : head
}

export function classifyShell(command, description, setup, powershell = false) {
  const name = (word) => (powershell ? base(word).toLowerCase() : base(word))
  const texts = new Set()
  const own = (words, ps = powershell) => {
    if (!ps) return words
    let rest = words
    const psCond = /^(?:if|elseif|while)$/i.test(rest[0] ?? '')
    if (/^(?:else|try|finally|do)$/i.test(rest[0] ?? '') || psCond) {
      rest = rest.slice(1)
    }
    const first = rest[0] ?? ''
    const ungrouped = () => {
      const headWord = rest[0] ?? ''
      const stripped = headWord.length - headWord.replace(/^\(+/, '').length
      if (stripped > 0) {
        const bare = headWord.slice(stripped)
        rest = bare === '' ? rest.slice(1) : [bare, ...rest.slice(1)]
        if (rest.length > 0) {
          const last = rest[rest.length - 1] ?? ''
          const tailParens = Math.min(stripped, closedBy(last))
          if (tailParens > 0) {
            const trimmed = last.slice(0, -tailParens)
            rest = trimmed === '' ? rest.slice(0, -1) : [...rest.slice(0, -1), trimmed]
          }
        }
      }
    }
    if (first.startsWith('$')) {
      const at = first.search(/[-+*/]?=/)
      if (at >= 0) {
        const value = first.slice(at).replace(/^[-+*/]?=/, '')
        rest = value === '' ? rest.slice(1) : [value, ...rest.slice(1)]
      } else if (/^[-+*/]?=$/.test(rest[1] ?? '')) rest = rest.slice(2)
      else if (/^[-+*/]?=/.test(rest[1] ?? '')) rest = [(rest[1] ?? '').replace(/^[-+*/]?=/, ''), ...rest.slice(2)]
      else return []
      ungrouped()
      if (rest[0] !== '&' && rest[0] !== '.' && !/^[A-Za-z][\w.:\\/-]*$/.test(rest[0] ?? '')) return []
    }
    ungrouped()
    if (rest[0] === '&' || rest[0] === '.') return rest.slice(1)
    if (/^[@{[]/.test(rest[0] ?? '')) return []
    if (/^["']/.test(rest[0] ?? '')) texts.add(rest)
    return rest
  }

  const nameOnly = (word) => {
    const found = base(word ?? '')
    if (!/^[\p{L}\p{N}_][\p{L}\p{N}_.+-]*$/u.test(found)) return 'shell'
    const isKnown =
      KNOWN_WORDS.has(found) ||
      (powershell && (PS_KNOWN_WORDS.has(found.toLowerCase()) || KNOWN_WORDS.has(found.toLowerCase()))) ||
      setup.memoryCommands.some((c) => named(name(found), c)) ||
      [...setup.commandStations.keys()].some((c) => named(name(found), c))
    return isKnown ? found : 'shell'
  }

  let followed = 0
  let spent = false
  const inPowerShell = new Set()

  const commands = (words, deep = false, depth = 0, ps = powershell) => {
    const outer = unwrapped(words, name)
    const head = name(outer[0])
    if (ps) inPowerShell.add(outer)
    if (depth > 0 && ++followed > FOLLOWED) {
      spent = true
      return [outer]
    }
    if (!ps && depth < 3) {
      let line
      if (head === 'eval') line = outer.slice(1).map(unquoted).join(' ')
      else if (SHELLS.has(head)) {
        const at = outer.findIndex((w, i) => i > 0 && !w.startsWith('-'))
        const flag = outer.findIndex((w, i) => i > 0 && /^-[a-z]*c$/.test(w))
        if (flag > 0 && (at < 0 || at > flag) && outer[flag + 1] !== undefined) line = unquoted(outer[flag + 1] ?? '')
      }
      if (line !== undefined) return segments(withoutHereDocuments(line).slice(0, READ), deep, true).flatMap((inner) => commands(inner, deep, depth + 1))
    }
    if (depth < 3) {
      const shell = head.toLowerCase().replace(/\.exe$/, '')
      const handed = (line, isPs) =>
        segments(line.slice(0, READ), deep, false, isPs)
          .map((inner) => own(inner, isPs))
          .filter((inner) => inner.length > 0)
          .flatMap((inner) => commands(inner, deep, depth + 1, isPs))
      const isText = (word) => /^["']/.test(word ?? '')
      if (ps && (shell === 'invoke-expression' || shell === 'iex')) {
        const text = outer.slice(1).map((w) => w.replace(/^-command:/i, '')).find((w) => !w.startsWith('-'))
        if (isText(text)) return [outer, ...handed(unquoted(text ?? ''), true)]
      }
      const flag = shell === 'pwsh' || shell === 'powershell'
        ? outer.findIndex((w, i) => i > 0 && /^-(?:c|command|commandwithargs|cwa)$/i.test(w))
        : shell === 'cmd'
          ? outer.findIndex((w, i) => i > 0 && /^\/[ck]$/i.test(w))
          : -1
      if (flag > 0 && outer[flag + 1] !== undefined) {
        const rest = outer.slice(flag + 1)
        const isPs = shell !== 'cmd'
        return [outer, ...(isText(rest[0]) ? handed(unquoted(rest[0] ?? ''), isPs) : commands(own(rest, isPs), deep, depth + 1, isPs))]
      }
    }
    const all = [outer]
    if (head === 'find') {
      for (let i = 1; i < outer.length; i++) {
        if (!/^-(?:exec|execdir|ok|okdir)$/.test(outer[i] ?? '')) continue
        const tail = outer.slice(i + 1)
        const end = tail.findIndex((w) => w === '\\;' || unquoted(w) === ';' || w === '+')
        all.push(...commands(end < 0 ? tail : tail.slice(0, end), deep, depth + 1))
        if (end < 0) break
        i += end + 1
      }
    }
    if (head === 'docker' && depth < 3) {
      let rest = pastFlags(outer.slice(1), DOCKER_TAKES)
      if (rest[0] === 'compose') rest = pastFlags(rest.slice(1), DOCKER_TAKES)
      if (rest[0] === 'container') rest = rest.slice(1)
      if (rest[0] === 'exec' || rest[0] === 'run') all.push(...commands(insideContainer(rest.slice(1)), deep, depth + 1))
    }
    return all.filter((c) => c.length > 0)
  }

  const isNet = (words) => {
    let head = name(words[0])
    let rest = words.slice(1)
    if (NET_WORDS.has(head) || ((powershell || inPowerShell.has(words)) && PS_NET_WORDS.has(head.toLowerCase()))) return true
    if (/^(?:python[\d.]*|py)$/.test(head) && rest[0] === '-m' && PY_MODULES.has(rest[1] ?? '')) [head, rest] = [rest[1] ?? '', rest.slice(2)]
    if (head === 'uv' && rest[0] === 'pip') [head, rest] = ['pip', rest.slice(1)]
    if (/^pip[\d.]+$/.test(head)) head = 'pip'
    if (head === 'yarn' && rest.every((w) => w.startsWith('-'))) return true
    if (head === 'git') rest = pastFlags(rest, GIT_TAKES)
    if (head === 'docker') {
      rest = pastFlags(rest, DOCKER_TAKES)
      if (rest[0] === 'compose') [head, rest] = ['docker compose', pastFlags(rest.slice(1), DOCKER_TAKES)]
    }
    if (head === 'npx' || head === 'bunx') return !rest.some((w) => w === '--no-install' || w === '--no' || w === '--offline')
    if (head === 'go' && rest[0] === 'run') return rest.slice(1).some((w) => !/^[-./]/.test(w) && /.@[\w.-]+$/.test(w))
    if (head === 'deno' && rest[0] === 'run') return rest.slice(1).some((w) => /^["']?(?:https?:|npm:|jsr:)/.test(w))
    const subs = NET_SUBCOMMANDS[head]
    return subs !== undefined && (subs.has(rest[0] ?? '') || subs.has(`${rest[0] ?? ''} ${rest[1] ?? ''}`) || subs.has(`${rest[0] ?? ''} ${rest[1] ?? ''} ${rest[2] ?? ''}`))
  }

  const cutState = { short: false }
  const whole = powershell ? command : withoutHereDocuments(command, cutState)
  const read = whole.slice(0, READ)
  const isCutShort = cutState.short || whole.length > READ
  const lines = segments(read, false, !powershell, powershell).map((words) => own(words)).filter((words) => words.length > 0)
  const label = description.trim() || (lines[0] !== undefined && texts.has(lines[0]) ? 'shell' : nameOnly(lines[0]?.[0]))
  const run = lines.flatMap((words) => commands(words))

  const reaches = (left = () => false) => {
    followed = 0
    return segments(read, true, !powershell, powershell).map((words) => own(words)).flatMap((words) => commands(words, true)).some((words) => !left(words) && isNet(words))
  }

  const isMemory = (words) => {
    const head = name(words[0])
    const script = RUNNERS.has(head) && words[1] ? base(words[1]) : ''
    return setup.memoryCommands.some((c) => named(head, c) || named(script, c))
  }

  const remembered = run.find(isMemory)
  if (remembered !== undefined) {
    if (run.some((words) => !isMemory(words) && isNet(words)) || reaches(isMemory)) return { station: 'web', label }
    return { station: 'memory', label: memoryLabel(remembered, setup) }
  }

  const placed = (words) => {
    const head = name(words[0])
    const script = RUNNERS.has(head) && words[1] ? base(words[1]) : ''
    for (const [cmd, station] of setup.commandStations) {
      if (named(head, cmd) || named(script, cmd)) return station
    }
    return undefined
  }

  const chosen = run.map(placed).find((station) => station !== undefined)
  if (chosen !== undefined) {
    const isPlaced = (words) => placed(words) !== undefined
    const elsewhere = run.some((words) => !isPlaced(words) && isNet(words)) || reaches(isPlaced)
    return { station: elsewhere ? 'web' : chosen, label }
  }

  if (run.some(isNet) || reaches()) return { station: 'web', label }

  const isNeutral = (head) => NEUTRAL_WORDS.has(head) || (powershell && PS_NEUTRAL_WORDS.has(head))
  const isFile = (head) => FILE_WORDS.has(head) || (powershell && PS_FILE_WORDS.has(head))
  const real = run.filter((words) => !isNeutral(name(words[0])))
  if (!spent && !isCutShort && real.length > 0 && real.every((words) => isFile(name(words[0])))) {
    return { station: isMemoryPath(read, setup) ? 'memory' : 'files', label }
  }
  return { station: 'shell', label }
}

const SERVER_STATIONS = ['files', 'shell', 'web', 'browser', 'agents', 'skills', 'you']

const parseList = (v) => (Array.isArray(v) ? v : typeof v === 'string' ? v.split(',') : []).map((x) => String(x).trim()).filter(Boolean)

export function createClassifySetup(options = {}) {
  const memoryLabels = new Map()
  for (const pair of parseList(options.memoryLabels)) {
    const at = pair.indexOf('=')
    if (at > 0 && at < pair.length - 1) memoryLabels.set(pair.slice(0, at).trim(), pair.slice(at + 1).trim())
  }
  const stationsFrom = (value) => {
    const chosen = new Map()
    for (const pair of parseList(value)) {
      const at = pair.indexOf('=')
      const st = SERVER_STATIONS.find((id) => id === pair.slice(at + 1).trim())
      if (at > 0 && st !== undefined) chosen.set(pair.slice(0, at).trim(), st)
    }
    return chosen
  }
  return {
    memoryServers: options.memoryServers === undefined ? new Set(['memory']) : new Set(parseList(options.memoryServers)),
    memoryCommands: parseList(options.memoryCommands),
    memorySubcommands: new Set(parseList(options.memorySubcommands)),
    memoryPaths: parseList(options.memoryPaths),
    memoryLabels,
    serverStations: stationsFrom(options.serverStations),
    commandStations: stationsFrom(options.commandStations),
    hookRecords: options.hookRecords === true || options.hookRecords === 'true',
    hookReasons: options.hookReasons === true || options.hookReasons === 'true',
  }
}

export function classify(tool, input = {}, setup = createClassifySetup()) {
  const safeInput = input && typeof input === 'object' ? input : {}

  // DSH Mnemon memory tools
  if (tool.startsWith('mnemon_')) {
    const rawShort = tool.slice('mnemon_'.length)
    const shortName = rawShort.replace(/_+/g, ' ')
    const id = typeof safeInput.id === 'number' || (typeof safeInput.id === 'string' && /^[\w-]{1,24}$/.test(safeInput.id)) ? ` #${safeInput.id}` : ''
    return { station: 'memory', label: (setup.memoryLabels.get(tool) ?? setup.memoryLabels.get(rawShort) ?? shortName) + id }
  }

  switch (tool) {
    // Files (DSH + Claude Code)
    case 'read':
    case 'write':
    case 'edit':
    case 'read_image':
    case 'Read':
    case 'Write':
    case 'Edit':
    case 'NotebookEdit': {
      const path = str(safeInput.file_path) || str(safeInput.path) || str(safeInput.notebook_path)
      return { station: isMemoryPath(path, setup) ? 'memory' : 'files', label: lastTwo(path) || tool }
    }
    case 'glob':
    case 'grep':
    case 'Grep':
    case 'Glob':
    case 'LSP':
    case 'working_directory':
    case 'create_worktree':
    case 'load_workspace_dependencies':
    case 'office_render':
    case 'office_convert':
    case 'office_recalculate':
      return { station: 'files', label: tool }

    // Shell (DSH + Claude Code)
    case 'bash':
    case 'Bash':
      return classifyShell(str(safeInput.command), str(safeInput.description), setup, false)
    case 'pwsh':
    case 'PowerShell':
      return classifyShell(str(safeInput.command), str(safeInput.description), setup, true)
    case 'Monitor':
    case 'job_output':
    case 'job_list':
    case 'job_kill':
      return { station: 'shell', label: str(safeInput.description) || tool }

    // Network (DSH + Claude Code)
    case 'web_fetch':
    case 'WebFetch':
      return { station: 'web', label: hostOf(str(safeInput.url)) || tool }
    case 'web_search':
    case 'advanced_search':
    case 'multi_search':
    case 'platform_search':
    case 'domain_search':
    case 'video_search':
    case 'research':
    case 'WebSearch':
      return { station: 'web', label: 'web search', labelKey: 'webSearch' }
    case 'weather':
    case 'cache_search':
    case 'free_search_test':
      return { station: 'web', label: tool }
    case 'Artifact':
      return { station: 'web', label: 'artifact', labelKey: 'artifact' }
    case 'ArtifactComments':
    case 'ArtifactData':
    case 'SendToProject':
    case 'SendToProjectContext':
    case 'Projects':
    case 'ClaudeDesign':
    case 'DesignSync':
    case 'ShareOnboardingGuide':
    case 'PublishPlugin':
      return { station: 'web', label: tool }
    case 'ListMcpResourcesTool':
    case 'ReadMcpResourceTool':
    case 'ReadMcpResourceDirTool':
      return { station: setup.memoryServers.has(str(safeInput.server)) ? 'memory' : (setup.serverStations.get(str(safeInput.server)) ?? 'web'), label: tool }

    // Agents (DSH + Claude Code)
    case 'subagent':
    case 'subagent_fork':
    case 'Agent': {
      const desc = str(safeInput.description) || str(safeInput.name)
      return desc ? { station: 'agents', label: desc } : { station: 'agents', label: 'subagent', labelKey: 'subagent' }
    }
    case 'workflow':
    case 'Workflow': {
      const name = safeInput.meta && typeof safeInput.meta === 'object' ? str(safeInput.meta.name) : ''
      return name ? { station: 'agents', label: name } : { station: 'agents', label: 'workflow', labelKey: 'workflow' }
    }
    case 'send_message':
    case 'list_agents':
    case 'wait_agent':
    case 'schedule_create':
    case 'schedule_edit':
    case 'schedule_list':
    case 'schedule_view':
    case 'team_task_create':
    case 'team_task_get':
    case 'team_task_list':
    case 'team_task_update':
    case 'SendMessage':
    case 'TaskStop':
    case 'ListAgents':
    case 'CronCreate':
    case 'CronDelete':
    case 'CronList':
    case 'ScheduleWakeup':
    case 'RemoteTrigger':
    case 'SubagentHandback':
    case 'SendFile':
    case 'Poll':
    case 'Yield':
    case 'ReadNotifications':
      return { station: 'agents', label: tool }

    // Skills (DSH + Claude Code)
    case 'skill':
    case 'Skill': {
      const name = str(safeInput.name) || str(safeInput.skill)
      return name ? { station: 'skills', label: name } : { station: 'skills', label: 'skill', labelKey: 'skill' }
    }
    case 'ToolSearch':
      return { station: 'skills', label: 'loading tools', labelKey: 'loadingTools' }
    case 'plugin_manager':
    case 'list_subagent_models':
    case 'ListSkills':
    case 'SearchSkills':
    case 'SuggestSkills':
    case 'ListPlugins':
    case 'SearchPlugins':
    case 'SuggestPluginInstall':
    case 'ListConnectors':
    case 'SearchMcpRegistry':
    case 'SuggestConnectors':
    case 'WaitForMcpServers':
      return { station: 'skills', label: tool }

    // You (DSH + Claude Code)
    case 'ask_user_question':
    case 'AskUserQuestion':
      return { station: 'you', label: 'question for you', labelKey: 'questionForYou' }
    case 'present':
    case 'SendUserFile':
      return { station: 'you', label: 'file for you', labelKey: 'fileForYou' }
    case 'todo_write':
    case 'create_goal':
    case 'update_goal':
    case 'get_goal':
    case 'sidebar_open':
    case 'TaskCreate':
    case 'TaskUpdate':
    case 'TaskList':
    case 'TaskGet':
    case 'TodoWrite':
    case 'EnterPlanMode':
    case 'ExitPlanMode':
    case 'PushNotification':
    case 'ReportFindings':
    case 'SendUserMessage':
    case 'FetchInboxMessage':
    case 'SendFeedback':
    case 'ProposeGoal':
    case 'propose_skills':
    case 'WrapUp':
    case 'ShowOnboardingRolePicker':
    case 'OfferChromeSetup':
    case 'ReadWidgetContext':
    case 'EndConversation':
      return { station: 'you', label: tool }
  }

  // Browser tools directly exposed
  if (/^(?:browser_|playwright_|ego_browser)/i.test(tool)) {
    const url = str(safeInput.url)
    return { station: 'browser', label: url && /^[a-z]+:/i.test(url) ? hostOf(url) : tool.replace(/_+/g, ' ') }
  }

  // MCP tools: mcp__<server>__<name>
  const mcp = /^mcp__([^_].*?)__(.+)$/.exec(tool)
  if (mcp === null) return { station: 'shell', label: tool }
  const [, server = '', name = ''] = mcp
  if (setup.memoryServers.has(server)) {
    const id = typeof safeInput.id === 'number' || (typeof safeInput.id === 'string' && /^[\w-]{1,24}$/.test(safeInput.id)) ? ` #${safeInput.id}` : ''
    return { station: 'memory', label: (setup.memoryLabels.get(name) ?? name.replace(/_+/g, ' ')) + id }
  }
  const chosen = setup.serverStations.get(server)
  if (chosen !== undefined) return { station: chosen, label: `${server}: ${name.replace(/_+/g, ' ')}` }
  const remote = server === 'remote-devices' ? /^Claude_Browser__(.+)$/.exec(name) : null
  if (
    server === 'Claude_Browser' ||
    server === 'claude-in-chrome' ||
    /playwright|browser|chrome|puppeteer/i.test(server) ||
    remote !== null
  ) {
    const url = str(safeInput.url)
    const action = remote?.[1] ?? name
    return { station: 'browser', label: url && /^[a-z]+:/i.test(url) ? hostOf(url) : action.replace(/_+/g, ' ') }
  }
  if (server === 'terminal') return { station: 'shell', label: name.replace(/_+/g, ' ') }
  if (server === 'visualize' || server.startsWith('ccd_')) return { station: 'you', label: name.replace(/_+/g, ' ') }
  if (server === 'plugin-authoring') return { station: 'skills', label: name.replace(/_+/g, ' ') }
  return { station: 'web', label: `${server}: ${name.replace(/_+/g, ' ')}` }
}

export function shortModel(model) {
  if (typeof model !== 'string') return ''
  const raw = (model.includes('/') ? model.slice(model.lastIndexOf('/') + 1) : model).replace(/-\d{8}$/, '')
  const m = /claude-([a-z]+)-(\d+)(?:-(\d{1,2})(?!\d))?/i.exec(raw)
  if (m !== null) return `${m[1]} ${m[2]}${m[3] !== undefined ? `.${m[3]}` : ''}`
  return cut(raw, 22)
}

export function firstLine(text, max = 72) {
  if (typeof text !== 'string') return ''
  const line = (text.split('\n').find((l) => l.trim() !== '') ?? '').trim()
  return cut(line, max)
}

export function memoryIds(text) {
  if (typeof text !== 'string') return []
  return [...new Set([...text.matchAll(/\[(?:[a-z]+ )?#(\d+)/g)].map((m) => m[1] ?? '').filter(Boolean))]
}
