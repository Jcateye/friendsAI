# Merge Rules

## Entity keys
- Epic: `E-*`
- Capability: `C-*`
- Story: `US-*`
- Milestone: `M-*`
- External dependency: `EXT-*`

## Merge mode
- `generate`: replace model with incoming candidate
- `append`: merge by ID

## Conflict detection
Conflict object shape:
- `entity_type`
- `id`
- `field`
- `old_value`
- `new_value`
- `recommendation`

## Conflict policy
- `prompt`: stop with `needs_resolution` when unresolved conflicts exist
- `keep_old`: old value wins
- `use_new`: new value wins
- resolution file may set per-conflict manual value

## Managed markdown blocks
Each managed file uses:

```html
<!-- AUTO:START -->
... generated content ...
<!-- AUTO:END -->

<!-- MANUAL:START -->
... human content ...
<!-- MANUAL:END -->
```

Rules:
- tool rewrites AUTO only
- tool preserves MANUAL
- first migration of unmanaged files moves old full content to MANUAL

## Files managed
- `README.md`
- `Roadmap/Blueprint Tree.md`
- `Roadmap/Dependencies.md`
- `Roadmap/Milestones.md`
- `Architecture/Architecture A - Layers.md`
- `Architecture/Architecture B - Containers.md`
- `Stories/README.md`
- `Stories/US-*.md`
