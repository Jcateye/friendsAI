---
name: dingtalk-shanji-context
description: Parse DingTalk Shanji transcript links (shanji.dingtalk.com/app/transcribes/...) and return summary, key snippets, transcript text, transcript segments, and audio URL for chat grounding.
---

# DingTalk Shanji Context

Use this skill when a user provides a DingTalk Shanji link and wants to understand what was discussed.

## Trigger Guidance

- Detect URLs like:
  - `https://shanji.dingtalk.com/app/transcribes/<id>`
- Common intents:
  - "解析闪记"
  - "提取纪要"
  - "给我音频链接"
  - "总结和客户聊了什么"

## Workflow

1. Validate the URL host/path is Shanji transcript.
2. Run `scripts/extract-shanji.mjs` to fetch transcript/audio candidates.
3. Return:
   - concise summary
   - 3-5 key snippets
   - audio URL (if found)
   - short confidence note if extraction is partial
4. Keep full transcript in structured output, avoid dumping very long raw text unless user asks.

## Command

```bash
node .agents/skills/dingtalk-shanji-context/scripts/extract-shanji.mjs "<shanji_url>"
```

Optional flags:

```bash
node .agents/skills/dingtalk-shanji-context/scripts/extract-shanji.mjs "<shanji_url>" --storage-state "/abs/path/storage-state.json" --headful
```

## Output Contract

The script outputs JSON with:

- `sourceUrl`
- `summary`
- `keySnippets`
- `audioUrl`
- `transcriptText`
- `transcriptSegments`
- `fetchedAt`

