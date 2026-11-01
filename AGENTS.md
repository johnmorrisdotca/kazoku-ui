# Agents: start here

`@johnmorrisdotca/kazoku-ui` (家族, kazoku, "family") is the family's shared interface parts as one versioned npm package. Each part is its own subpath
export (`@johnmorrisdotca/kazoku-ui/view-controls` is the first). Read [CONTRIBUTING.md](CONTRIBUTING.md) for the rules and the commands.

- **No runtime dependencies. MIT.** Never put John's SPX, SPXN or SPXIS marks, or any brand, league or sponsor mark, in this package.
- **A part never draws the page's scene.** The view controls report state; the page draws.
- **Ports:** this package owns local ports 8100 to 8199 (demo 8100, tests 8101, pictures 8102). Check with `lsof -iTCP:<port> -sTCP:LISTEN` first, stop only your own server by its process id, never `pkill`.
- **Checks before a push:** `pnpm check`, `pnpm test:demo`.
- **Do not tag and do not publish.** The first publish needs John's yes. Tags and npm publishing are done by the coordinating session (the Release workflow publishes by trusted publishing).
- Commits as John Morris <john@johnmorris.ca>, Conventional Commits, subject 50 characters or less, files added by name, no AI attribution.
- No GitHub issues, pull requests, discussions or comments from an agent.
- Japanese: whatever you write, give the English beside it in your report; have it read by someone who reads Japanese before it ships.
- A docs page is in one language (the page about the translations, `docs/labels.md`, is the exception).
