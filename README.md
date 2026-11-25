# Lot Map for DeepSeek Harness

English | [中文](README.zh.md)

A 1:1 port of [alexeyw/lot-map](https://github.com/alexeyw/lot-map) (MIT) to DeepSeek Harness: a live map of the work beside the chat. Every tool call, model step, hook, skill and subagent sends a pulse from the centre to its station, so you see memory, files, shell, network, browser and agents at work instead of reading a list of commands.

It runs on your machine and sends nothing anywhere.

## Install

- In DSH: **Plugins → Marketplace**, search `dsh-lot-map`, install.
- From the command line, then restart DSH:

  ```sh
  dsh plugin --profile <profile> add github:DestinySail/dsh-lot-map
  ```

## Open it

Any one of these:

- the map button in the conversation header's utilities (a dot appears while something runs);
- **Plugins → guide** in the right Sidebar: the *Work map* card;
- `Alt+Shift+M`;
- `/lot-map` in the composer.

## What lights up

| Station | When |
| --- | --- |
| You | your messages, questions, files sent to you, the task list, the goal, the plan, and what you are asked to approve |
| Model | each model step, a change of model, context compaction |
| Memory | the `mnemon_*` tools, `MEMORY.md` / `USER.md` reads and writes, memory commands you name |
| Files | `read`, `write`, `edit`, `grep`, `glob`, `read_image`, office tools, and shell commands that only touch files (`cat`, `grep`, `mv`, `rm`, `sed`, `Get-Content`, `Select-String`, …) |
| Shell | every other shell command, plus background jobs |
| Network | `web_fetch`, every search tool, MCP servers, and shell commands known to reach the network (`curl`, `gh`, `ssh`, `git push`, `npm install`, `docker pull`, …) |
| Browser | browser, Playwright and Chrome MCP tools |
| Agents | `subagent`, `subagent_fork`, `workflow`, schedules and messages between agents |
| Skills | `skill`, plugin and skill catalogues |
| Hooks | context a hook or the runtime added, and calls a guard refused |

The shell stations go by the command's name: `git status` is Shell, `git push` is Network, `cat a | grep b` is Files. A command that runs another one counts as the inner one (`sudo`, `env`, `timeout`, `xargs`, `docker exec`, `bash -c`, `pwsh -Command`), and a here-document's text is not read.

## Reading the map

- **The route** joins the last few stations the main loop went through; a leg stays for 40 s and fades over 20.
- **Worn spokes** thicken with use, so the map remembers where the work went.
- **Clock hands** around a running station: the inner one laps in a minute, the outer in ten.
- **The ring around the centre** is the context window; it turns amber at 70% and red at 90%.
- **Pulses** fly out when a call starts and back when it ends; refusals and errors turn red and leave a counted red dot until your next message.
- **Subagents** circle the Agents station while their delegation call runs.
- **Below the map**: what runs now, then the last 16 rows. Finished calls that follow at one station fold into one row (`+2`); a long row opens with `▸`.

Each row shows its own duration, and with `contextCost` on, about how many tokens the context grew by with that call (`85 ms +42k`, or `~` when shared or partial), with each station's session sum on the map (`9 · 180k`). It is an estimate: DSH reports prompt usage per step, so a call's figure lands when the next step is answered.

## Options

Open **⚙** in the pane, or edit `localStorage['dsh.lot-map.settings.v1']`.

| Option | Default | Meaning |
| --- | --- | --- |
| `language` | `auto` | `auto` follows the interface; or `en`, `zh` |
| `coreName` | `DSH` | what the circle in the middle says, up to ten characters |
| `theme` | `auto` | `dark`, `light`, or `auto`, which follows the DSH theme |
| `background` | `solid` | the map's own ground, or `transparent` for the pane behind it |
| `paneBackground` | `theme` | what the pane itself is painted with: `theme` (host sidebar), `solid` (map ground), `transparent`, or `#rrggbb` |
| `layout` | `you-top` | `you-top`, or `you-bottom`, which turns the ring half a turn |
| `motion` | `full` | `reduced` stops everything flying, spreading and spinning |
| `contextCost` | off | show each call's share of the context's growth |
| `contextWindow` | `model` | what the context ring measures against: `model`, or `compaction` (auto-compact threshold when available) |
| `textSize` | `footnote` | `caption`, `footnote` or `body` |
| `logRows` | `16` | `16`, or `fill` for as many rows as the pane holds |
| `openAtStart` | on | open the pane by itself for each new session |
| `colors` | none | `accent=#7fb4ff,active=#b8d6ff`; names are `background`, `node`, `line`, `spoke`, `text`, `label`, `faint`, `accent`, `active`, `error`, `memory`, `memoryActive`, `route` |

### Classification & Hooks (`cordis.patch.yml`)

Tool classification and hook options run in the host projection and can be configured under `config:` in `cordis.patch.yml`:

```yaml
- insert:
    - id: lot-map
      name: 'dsh-lot-map'
      config:
        memoryServers: memory,my-memory
        hookRecords: true
        hookReasons: true
```

| Option | Default | Meaning |
| --- | --- | --- |
| `memoryServers` | `memory` | comma-separated MCP servers whose tools light Memory (setting this replaces the default) |
| `memoryCommands` | none | shell commands or scripts that light Memory |
| `memorySubcommands` | none | subcommands after a memory command allowed in labels |
| `memoryPaths` | none | path substrings that classify file reads/writes as Memory |
| `memoryLabels` | none | short labels for memory tools (`tool=name`) |
| `serverStations` | none | route MCP servers to a station (`server=station`) |
| `commandStations` | none | route shell commands to a station (`command=station`) |
| `hookRecords` | `false` | extract `[#123]` record numbers from injected memory context |
| `hookReasons` | `false` | show the first line (up to 72 chars) of a guard/sandbox denial |

## What it reads and keeps

The plugin registers one session projection (`lotMap`) that folds committed session events only. It takes names from tool arguments: a label holds the last two parts of a path, the host of a URL, a tool name, or the description the model wrote — never file contents, search patterns, queries or memory text. It makes no network request, runs no process, calls no model, and adds nothing to the conversation. Preferences live in this browser's `localStorage`; the board lives only for the session.

Removing the plugin removes the projection, the sidebar tab, the header button, the shortcut and `/lot-map`; stored transcripts are untouched.

## Limitations

- DSH runs each subagent in its own Session, so the parent's map shows a child as an orbiting dot while its delegation call runs, not the child's own steps.
- Model-change markers (`◆ old → new`) are detected within each session; cross-session model history per folder is not persisted.
- DSH has no settings-hook events, so the Hooks station shows injected context and guard refusals instead.
- The map is re-drawn when the board changes; SMIL animations carry the motion in between, so a call's clock hands run smoothly but the "running" text does not tick.

## License

Portions ported from alexeyw/lot-map, MIT. This package is MIT as well.
