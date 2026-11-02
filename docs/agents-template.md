# One AGENTS.md for every package repo

`templates/AGENTS.md` is the agent-instruction file for the family's package repos. Agents (Claude, Cline, others) tripped on every repo having its own steps for the board, ports, checks, release and hand-off; this holds them once.

## How it is built

- Above the line `<!-- repo-specific: ... -->` are the family rules, identical in every repo: read spx-stats `docs/package-work.md` first; the board and ticket rules; one agent per repo in a worktree; ports; commits; the checks, release and hand-off path; how to report.
- Below the line is the repo's own: a **Facts** table (package, repo, board, title prefix and `--area`, port block, checks, release path, hand-off project) and a short "This repo" section for rules true only there.
- It is public: no private host, address, home path, login or key. `test/template.test.ts` holds the marker, the table's rows and that.

## Adopting it

When a repo is next touched, one agent per repo:

1. Copy `templates/AGENTS.md` over the repo's `AGENTS.md` (or add one). Fill in the Facts table from the one-home table in spx-stats `docs/package-work.md` and the repo's `CONTRIBUTING.md`.
2. Move what the old file said that is only true here (a data licence, a work log, a rule about what a part must never draw) under "This repo". Drop what the family part already says.
3. Later, to take a change to the family rules, replace everything above the marker with the template's and leave the rest.

## Which repos would adopt it

Every package repo on the `kazoku-ui` and `modules` boards and the two with their own board. None has been changed yet.

| Has an AGENTS.md today | Has none today |
|---|---|
| kazoku-ui (the template's source; its own file stays), meigen-sports, address-plus, chikyu-earth, uchusen-rockets, fuda-cards, hako-devices | dougu-sports, kyogijo-stadiums, senshu-jerseys, taisen-brackets, hata, chizu, kuni, meet-prompter |

fuda-cards keeps its work-log routine and meigen-sports its data rules under "This repo". hako-devices is a device project, so its Facts differ most. A repo whose `release.yml` still has its own steps says so in the Release row until it moves to the shared workflow ([release-workflow.md](release-workflow.md)).
