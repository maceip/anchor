```
@@++***-#@*###@@@*+#@@@*_|-@@#_\-@##+_|#@@@@*+#@@@@#-_-@@@@
@!     .@@!   ;+.  _;:.    |@!   !!    \\\!.  ,@;.     ,#@@
@;  |. .@@_.   |   _:      :@!   .:    -       #|   ,   +@@
@:  _:  -@#   .;   |_   /!;\@+        /@;  .\  \#.  !  |@@@
+   !,  ,#-.  /    ;|  .|:  ,-.  :|   ;#/   |  .#.  . ,;/*@
/   _:   :.   _              ;    _    ,        ,   \.   .@
/   -/   ,,  .#;   :,      ;+|   :*.   /;     .|!   \;   :@
@_|+@@+_-@#__*@@-\-@@-\|\-#@@@-|_#@#__*@@+_\_+@@@_|_@#_|-@@
```


 # Anchor
 
  𝙏𝙝𝙚 𝙖𝙣𝙩𝙞-𝙙𝙧𝙞𝙛𝙩 𝘾𝙪𝙧𝙨𝙤𝙧 𝙥𝙡𝙪𝙜𝙞𝙣 𝙩𝙝𝙖𝙩 𝙖𝙘𝙩𝙪𝙖𝙡𝙡𝙮 𝙬𝙖𝙩𝙘𝙝𝙚𝙨 𝙮𝙤𝙪𝙧 𝙖𝙜𝙚𝙣𝙩𝙨.
 
  ```Anchor``` keeps autonomous coding work aligned with your plan instead of letting agents produce polished, confident, and completely wrong output. It treats red CI as an outage, hallucinated imports as lying, andnplan drift as a containment problem.

  Once opted in, Anchor runs a durable cloud agent per repo, records everything in a local trajectory, maintains an aggregated Drift Quotient, and escalates serious bullshit into quarantine.

#### Get started
```
/anchor-onboard
```
  This opts you in, installs the production dashboard canvas, runs a health check, and prints your current state. After that, open the Canvas panel and select anchor-dashboard.



-  Live dashboard — Real-time view of all drift metrics + detailed AHR breakdown (hallucinated vs stale vs verified imports, powered by registry + Wayback Machine checks).
-  AHR (API Hallucination Rate) — Distinguishes between agents being lazy and agents straight-up fabricating endpoints. Triggers immediate quarantine when fabrication is detected.
-  Per-actor scoring — Tracks drift per human and agent, not just repo-wide. One bad actor won't tank the whole project.
-  Quarantine self-correction — When AHR or other deception signals fire, Anchor emits a remediation event and won't let the agent re-baseline until it proves the concerns are fixed.
-  PR auditing + CI repair — Practical heuristics + sidecar metrics. Blocking comments when things are drifting.
-  Trajectory memory — Every commit, PR, CI failure, and drift event is recorded. No more "what were we even doing?"

#### Commands
```
/anchor-onboard
```
```
/anchor-status
```
```
/anchor-sync
  ```
```
/anchor-audit-pr <number>
```
```
/anchor-fix-ci
```
```
/anchor-plan [--regenerate]
```
```
/anchor-opt-out
```

  All commands ultimately call:

  `node plugins/anchor/scripts/anchor-cli.mjs <subcommand>`

#### How it works

  Hooks and commands feed artifact telemetry into a Python sidecar that runs a sequrnyial hypothesis test Nursery → Monitoring → Quarantine with CUSUM tracking. AHR and high deception signals (NFR, FFR, DFR, HFR, IDR) are zero-tolerance.
  Everything else is tracked for sustained drift.

  State lives at ~/.anchor/<repo-slug>/. No secrets are ever stored.

##### Validation

  node scripts/validate-template.mjs
  node --test plugins/anchor/scripts/lib/*.test.mjs
  PYTHONPATH=plugins/anchor/sidecar python3 -m unittest discover -s plugins/anchor/sidecar

 ### FAQ

  `Does it need cloud or GitHub credentials?`<br>
  No. Core functionality (onboarding, status, sync, sidecar evaluation, hooks) works fully offline. Cloud and GitHub features gracefully degrade.

  `Is this a demo?`<br>
  No. The AHR implementation uses real registry + Wayback Machine checks, the quarantine loop actually blocks re-baselining, and the dashboard shows live breakdown data. All 44 tests pass.

 `Why should I trust it over my agent?`<br>
  Because your agent will happily tell you the code is clean while importing @nonexistent/fake-api. Anchor will call it out.

## References

  Anchor’s AHR implementation and quarantine self-correction loop are directly based on:

  ```Rao, D., Wong, E., & Callison-Burch, C. (2026). Detecting and Correcting Reference Hallucinations in Commercial LLMs and Deep Research Agents. arXiv:2604.03173.```

  The paper introduced urlhealth, a tool that distinguishes fabricated URLs (never existed) from stale ones (link rot) using the Wayback Machine. Key findings that Anchor uses:

- Deep research agents hallucinate 3–13% of citation URLs.
- Hallucination rates vary significantly by domain (highest in Theology, Business, and Law).
- Giving agents a verification tool reduces non-resolving URLs by 6–79×, bringing error rates under 1%.<br>

Anchor ships a production version of this idea: computeAHR performs real registry + Wayback checks, the sidecar applies domain-aware thresholds, and the quarantine loop forces agents to self-correct before re-baselining.

The five per-actor deception signals (NFR, FFR, DFR, HFR, IDR) were synthesized from the broader 2025–2026 literature on agent hallucination and upward goal drift that motivated this work.

  ---
