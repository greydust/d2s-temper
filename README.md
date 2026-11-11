# The Tempering Ledger

A static D2 Survivors tempering planner, ready for GitHub Pages. No backend, accounts, package installation or build step. Saved plans remain in the browser's localStorage and are never uploaded.

## Run locally

Use Node.js 24 or newer:

```sh
npm run dev
```

Open http://127.0.0.1:4173. Keep the terminal running. Opening index.html directly with a file URL will not load the catalogue because browsers restrict local module/fetch requests.

```sh
npm test
```

## Publish on GitHub Pages

The repository already points to `greydust/d2s-temper`. The included `.github/workflows/pages.yml` tests and deploys the static files when changes reach `main`.

1. Commit and push the files to the GitHub repository.
2. In repository **Settings → Pages → Build and deployment**, choose **GitHub Actions** as the source.
3. Run **Deploy to GitHub Pages** under Actions, or push to `main` again.
4. The deployment job provides the public URL, normally `https://greydust.github.io/d2s-temper/`.

All asset links are relative, so a repository subpath works. Only index.html, style.css, app.js, solver.js, item-model.js and data/items.json are deployed. Game files, research, development scripts and tests are not part of the Pages artifact. Google Fonts is optional typography; system fallbacks work without it.

Enable GitHub Pages with GitHub Actions as the deployment source before the first deployment.

## What it does

- Unique, set and runeword item selectors grouped by equipment slot; a searchable item dropdown and eligible affix selection.
- Rare items with 3–10 temperable affixes; target one selected affix without needing its name.
- Targets of 1–10 added rolls on one chosen affix; results update automatically after selection.
- Exact minimum-expected-cost temper/clean policy and readable reset checkpoints.
- Browser-only saved plans that can be restored or deleted.
- Responsive layout, labeled native controls and keyboard focus indicators.

A “roll” is a successful temper on the chosen affix, not a numeric stat value. Success means finishing all 10 successful tempers with at least the requested hits on the chosen affix. Plans start from an untempered item. Reaching the target early never ends the calculation. Single-line items hide both affix and target selectors and always finish 10 tempers (21.25 expected essences, no resets). Hellforge itself is not included in the cost.

## Mechanics and sources

Inspected the installed **2026.1105.3** app at `D:\D2 Survivors\resources\app.asar` and the user's extracted `itemstats.json`. The [developer's Charsi's Forge guide](https://d2survivors.lol/wiki/charsis-forge/) corroborates the rules for the same build.

- One essence per temper attempt, or per clean.
- At `n` currently held successful tempers, success probability is `4 / (4+n)`.
- A miss spends the essence but changes no counts. Each eligible line is equally likely on a success.
- Normal tempering stops at 10 held tempers; cleaning removes all of them.
- Skills/aura/triggered-skill levels gain one per hit. Numeric stats gain 20% of their original rolled value per hit, rounded for integers, minimum one. Damage-range endpoints are grouped.

The catalogue contains **578 item/slot combinations**: 368 uniques, 127 set items and 83 runeword/slot variants. Runewords include their socketed-rune properties for the selected slot. The catalogue stores names and eligible stat labels, not game art or full bundles.

The catalogue uses installed item properties. Base automods, staff skills and variable skill properties can change the actual eligible-line count. Separate attributes/resistances are separate entries in the client temper selection even if a tooltip combines their display. Set bonuses are not eligible.

## Optimizer

For `L` eligible lines, a success hits the target with probability `q=1/L`. States are `(n,h)`, with total held tempers `n` and chosen-line hits `h` capped at the target. All states before `n=10` must either temper or clean; attaining the target early is not terminal. Repeated misses form a self-loop, so the expected cost until the next successful temper is `1 / p(n) = 1+n/4`.

For normal temper/clean mode:

```text
V(n,h) = 0                                     if n = 10 and h >= target
V(n,h) = 1 + V(0,0)                            if n = 10, target unmet
V(n,h) = min(
  1 + V(0,0),                                 clean
  1+n/4 + q V(n+1,min(target,h+1)) + (1-q) V(n+1,h)       temper
)
```

The initial state must temper. The implementation solves a regenerative-cycle reward formulation by backward induction and bisection. Using terminal reward rather than subtracting a large restart value keeps rare-target calculations numerically stable. It independently evaluates expected cycle spending and completion probability to recover total attempts, cleans and cost.

Tests cover deterministic costs, independent exhaustive policy enumeration, Bellman optimality, cycle-cost consistency and catalogue integrity.

## Refreshing the local catalogue

The committed catalogue runs everywhere without the game. To regenerate it from this specific installed build:

```powershell
node scripts/extract-items.cjs "$env:APPDATA/D2 Survivors/d2" "D:/D2 Survivors/resources/app.asar"
```

The extractor reads the ASAR without modifying the installation. It evaluates isolated property-roll/line-eligibility helpers in a VM, then writes only the compact catalogue. Its helper names are tied to this minified build; review the extractor and mechanics after a game update. No save files are read.

## Additional affixes

The extractor flags 47 runeword/slot combinations with at least one eligible base. Eligibility uses the installed base-type hierarchy, runeword allowed/excluded types, socket capacity, staffMod types, and base automod types. Unique and set constructors never roll random staff skills or base automods, so they have no additional-affix input.

Eligible bases include Barbarian helms, Druid pelts, Paladin scepters, Necromancer wands/heads, Sorceress staves/orbs, eligible Assassin claws, Amazon weapons and Paladin shields. Some types cannot hold the sockets needed by any current runeword; the extractor filters these out. Paladin class helms are not a base category in the installed game.

The optional additional count defaults to zero whenever an item changes. Count extra **temperable selection entries**, not skill levels or already-listed item properties. For example, Paladin-shield resistances are four separate selection entries in this client, despite the combined tooltip. For rares, choose the full temperable count (3–10) directly; there is no separate additional-affix input.

For eligible runewords, the displayed total and optimizer both use catalogue lines plus additional affixes (up to 64 total). Each extra line is individually selectable as “Additional affix 1”, etc. Saved plans retain and restore the count and the target selection. The cost still covers all ten successful tempers before Hellforge.

Source: installed client functions cY/hZ (rare/runeword bonuses), eZ/iZ (fixed unique/set properties), BJ/lK (staff skills), IJ/FJ (automods), and uq (tempering groups), corroborated by the developer's Items wiki under Rarities.
