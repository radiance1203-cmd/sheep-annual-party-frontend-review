# Actual GamePage formal integration — 2026-10-27

Final execution **PASS, 36/36 assertions, exit 0**. Script: `real-game-ui.mts`. Final evidence: `cdc866b1-2c1e-485b-a012-2ec82db9f9cc/result.json`. The three `*-verified-result.png` files were actually opened and inspected: each displays its game, opportunity number, 20 participation points, 0 performance points, Chinese verified status and the real server statistics.

## Isolation and scope

- Fresh random UUID event `cdc866b1-2c1e-485b-a012-2ec82db9f9cc`; actual database guard required loopback hostname and database name ending `_test`, then verified `current_database() = sheep_test`.
- `seedDevelopment` created new development accounts; their invitations, fresh authentication/voucher keyrings, cookies, CSRF tokens, controller secrets, session nonces and full input/IDB records remained in memory. The product necessarily persists its submitted process in this isolated test database. No secret or full process is exported in this evidence.
- Temporary real HTTP server bound `127.0.0.1:0`. Browser used existing frontend 5175 and forwarded each API request with `route.fetch` to that server, then returned the actual HTTP response. No fabricated business responses, score inserts, default activity/invitation use or 3100 requests.
- One real participant used the three shared opportunities. Actual GamePage performed preflight/start, countdown, one button input, core progression, IndexedDB persistence, sealed finish and navigation. Actual JobRunner/shared game-core verified the submitted browser process. Results reloaded real server state.
- This is controlled automated Chromium evidence, **not human difficulty, physical phone, venue network or final visual acceptance**. No product/core/rule/dependency files were changed for this test.

## Final observed results

| Game | Session ID | Actual UI input | Core end | Accepted operations | Replay points |
|---|---|---|---|---|---|
| stack | `62de1708-1297-4d82-a488-417fe685d09b` | DROP ×1 | tick 1350 / TIME_LIMIT | 1 | 20 |
| runner | `8c46b290-964a-48fe-8362-3c7429e78e73` | JUMP ×1 | tick 1350 / TIME_LIMIT | 1 | 20 |
| herd | `204cf4ca-f8a1-4a62-a864-c0d5cb8eff2c` | BARK ×1 | tick 1350 / TIME_LIMIT | 1 | 20 |

All sessions reached SETTLED / VERIFIED. Each retained the exact preparation canvas through formal start, and each page had zero uncaught errors. The prepared core was tick 0. The original server timeline was checked per session: reservation 3 seconds, play 45 seconds, complete-submit deadline 60 seconds from play start. Submission preceded that original deadline by 14,636 / 14,596 / 14,584 ms respectively.

Final PostgreSQL counts for this event and participant: 3 sessions, 3 settled, 3 player slots, 3 BOUND slots, 3 unique SESSION_CREDIT entries, credit sum 60, ticket honor sum 60. Valid completed sessions retain BOUND tickets with their contribution; SPENT is a different allocation state. `/me` honor and wallet were both 60. No score was inserted directly.

Fourth tutorial entrance was disabled with the exhausted-opportunities message. A fresh direct start returned **409 NO_TICKET_SLOT**, and the counts remained three. Activity phase stayed PLAYING and the original activity close time did not reset.

## Clock method and preserved failures

The browser clock was installed before navigation and explicitly resumed before loading each new page. Preparation was allowed to complete actual image decode/Phaser first frame, observed through the enabled preparation button, before pausing. A canvas merely existing was not used as the readiness condition. Each fast-forward delta was first applied to the isolated service clock offset; service wall time continued normally. Browser used its ordinary synchronized API transport clock and unmodified GamePage/core code. The actual final browser transport-clock-minus-Date differences before natural-end advancement were 123 / 108 / 87 ms. Raw install/resume/pause/advance samples and offset deltas are in the JSON. All three finishes respected the original deadline despite this bounded skew.

The first run `8bff6cf6-560a-4cdc-a91f-d4162b845c1e/result.json` remains **FAIL**: stack completed a real verified 20-point UI process, then the next page could not complete preparation. Local Playwright source assigns `Page.clock = BrowserContext.clock` (`node_modules/playwright-core/lib/coreBundle.js:62889`); closing a paused page therefore did not resume the context clock. Explicit resume before the next page's preparation fixed the test harness cause. This is not recorded as a product failure.

The second run `6a5a516a-1913-42cc-9a13-1245fdf1c1d2/result.json` remains **FAIL**: all three actual UI sessions and fourth-entry rejection passed, then final test SQL incorrectly referenced `tickets.state` and expected SPENT. Schema/source inspection confirmed `tickets.allocation_state` and BOUND for valid current contribution. Only the test query and assertion label changed; the final fresh-event run above then passed all 36 checks. Both failed records and their captured terminal evidence remain unmodified.

## Resource closure

The successful run closed browser contexts/browser, real HTTP server, replay worker/pool and PostgreSQL pool in `finally`. The final JSON confirms all four closures. Isolated test-event database rows are retained as evidence; no original activity rows were changed or deleted.
