# CGC E2E Bug Report

**Date:** 2026-06-07 (initial E2E) · **Re-test:** 2026-06-07 after fixes  
**Package:** `codegraphcontext` **0.4.15** (editable install from repo into `/tmp/cgc-e2e-venv`)  
**Python:** 3.12.3  
**OS:** Linux 6.8.0-124-generic  
**Test method:** Manual subprocess E2E (no pytest). Isolated `HOME=/tmp/cgc-e2e-*` per scenario unless noted.  
**Primary fixture:** `tests/fixtures/sample_projects/sample_project` (Python, 44 files indexed)

---

## Fixes Applied (2026-06-07)

| Bug ID | Status | Fix summary |
|--------|--------|---------------|
| BUG-001 / BUG-018 | **FIXED** | Stop repo-local `.env` from overriding global DB path keys; ignore `FALKORDB_PATH` outside active `CONFIG_DIR` |
| BUG-002 | **FIXED** | CLI commands now exit **1** when DB/services fail to initialize |
| BUG-006 | **FIXED** | Kùzu/Ladybug bundle import uses PK-based edge matching instead of `id()` |
| BUG-007 | **FIXED** | `index` resolves context from target repo path, not shell CWD |
| BUG-008 | **FIXED** | `FALKORDB_HOST`, `FALKORDB_PORT`, etc. accepted via `cgc config set` |
| BUG-009 | **FIXED** | `cgc doctor` fails when `falkordb-remote` has no `FALKORDB_HOST` |
| BUG-010 | **FIXED** | MCP `add_code_to_graph` returns `success: false` for missing paths; outside-root paths return JSON-RPC error |
| BUG-012 | **FIXED** | Blocked `cgc query` write attempts exit **1** |
| BUG-016 | **FIXED** | `cgc bundle import --clear --yes` skips confirmation |
| BUG-022 | **FIXED** | Global `--database` help lists `ladybugdb` and `nornic` |

**Verification:** `/tmp/cgc_verify_fixes.sh` — **9/9 PASS**. Backend harness re-run — FalkorDB/Kuzu/Ladybug index **456 nodes** successfully.

**Still open:** BUG-003/004/005 (call-graph accuracy), BUG-011 (orphan nodes on clean), BUG-013 (Kuzu speed), BUG-019 (report scope), and others marked below.

---

## Executive Summary (post-fix)

| Area | Result |
|------|--------|
| **KuzuDB** | Index + export OK (456/629); slow (~17–27s); call-chain analysis still inaccurate |
| **LadybugDB** | Parity with KuzuDB on counts |
| **FalkorDB Lite** | **FIXED** — indexes in ~1.9s with isolated HOME (456 nodes) |
| **FalkorDB Remote** | Works via `cgc config set FALKORDB_HOST` or env vars |
| **Neo4j** | **SKIP** — port 7687 in use on test host |
| **Nornic** | **SKIP** — no instance |
| **MCP** | 25 tools; bad paths return errors (not silent success) |
| **Contexts** | Global/named OK; **per-repo fixed** for `cgc index <path>` |
| **Bundles** | Export + import round-trip **FIXED** on KuzuDB |

**Bugs found originally: 30** · **Fixed: 10** · **Remaining: 20**

---

## Test Matrix Summary

| Command / Scenario | FalkorDB | KuzuDB | LadybugDB | FalkorDB-Remote | Neo4j |
|-------------------|----------|--------|-----------|-----------------|-------|
| `cgc doctor` | PASS* | PASS | PASS | PASS† | FAIL‡ |
| `cgc index --force sample_project` | FAIL§ | PASS | PASS | PASS¶ | SKIP |
| `cgc stats` | FAIL§ | PASS | PASS | PASS | SKIP |
| `cgc find name f1` | FAIL§ (exit 0) | PASS | PASS | PASS | SKIP |
| `cgc analyze callers f2` | FAIL§ | PASS†† | PASS†† | PASS†† | SKIP |
| `cgc analyze chain f1 f3` | FAIL§ | FAIL†† | — | — | SKIP |
| `cgc analyze calls f1` | FAIL§ | FAIL†† | — | — | SKIP |
| `cgc find content "Hello"` | — | PASS | PASS | — | SKIP |
| `cgc query` (read) | FAIL§ | PASS | PASS | PASS | SKIP |
| `cgc query CREATE` (blocked) | — | FAIL‡‡ | — | — | SKIP |
| `cgc bundle export` | FAIL§ | PASS (456/628) | PASS (456/628) | PASS (456/629) | SKIP |
| `cgc bundle import --clear` | — | **FAIL** | — | — | SKIP |
| `cgc clean` | — | PASS (169 orphans deleted) | PASS | — | SKIP |
| `cgc delete` | — | PASS | PASS | — | SKIP |
| Context: global | — | PASS | — | — | — |
| Context: per-repo | — | **FAIL** | — | — | — |
| Context: named | — | PASS | — | — | — |
| MCP `tools/list` | — | PASS (25 tools) | — | — | — |
| MCP `find_code` | — | PASS | — | — | — |

\* Doctor reports FalkorDB installed but does not verify a live connection.  
† Doctor passes even when `FALKORDB_HOST` is unset for `falkordb-remote`.  
‡ Neo4j auth failed (`Invalid username or password`) against existing instance on :7687.  
§ Stale `/home/shashank/.codegraphcontext/global/db/falkordb.sock` caused worker crash + failed Kuzu fallback; commands returned **exit 0** with no user-visible error.  
¶ Requires `FALKORDB_HOST=127.0.0.1` env var; `cgc config set` does not work.  
†† Returns results but **caller attribution is wrong** (`<module>` instead of `f1`).  
‡‡ Query correctly blocked with message but **exit code 0**.

---

## Cross-Backend Parity (sample_project)

| Backend | Nodes | Edges | Index Time | Notes |
|---------|-------|-------|------------|-------|
| Golden (dev metadata) | 456 | 628 | ~1.3s (FalkorDB, v0.3.8 doc) | Reference from prior internal report |
| **KuzuDB** | 456 | 628 | **19.7s** | Matches golden counts |
| **LadybugDB** | 456 | 628 | **15.8s** | Matches golden counts |
| **FalkorDB Remote** | 456 | **629** | **0.9s** | +1 edge vs golden |
| **KuzuDB (re-verify)** | 456 | **629** | **16.8s** | +1 edge drift |
| **FalkorDB Lite** | — | — | — | Could not index (stale socket / wrong path) |
| **Neo4j** | — | — | — | SKIP |

### Language Sweep (KuzuDB, isolated HOME per project)

Earlier sweep from CGC repo CWD was **contaminated** by `.codegraphcontext` in the workspace (see BUG-025). With isolated HOME, Python sample consistently yields **456 nodes**.

| Project | Nodes/Edges (export) | Status |
|---------|---------------------|--------|
| sample_project | 456 / 629 | OK (edge +1) |
| sample_project_c | 74 / 96 | OK (prior isolated run) |
| sample_project_cpp | 128 / 167 | OK (prior isolated run) |
| sample_project_typescript | 904 / 1330 | OK |
| All other `sample_project_*` with goldens | Match prior harness | OK when HOME isolated |

---

## Bugs

### BUG-001: FalkorDB Lite ignores `HOME` and uses real user config path for DB/socket
- **Severity:** Critical
- **Category:** Accuracy / UX
- **Backend(s):** falkordb
- **Repro steps:**
  ```bash
  export HOME=/tmp/cgc-isolated-$(date +%s)
  mkdir -p "$HOME"
  cgc config db falkordb
  cgc index --force tests/fixtures/sample_projects/sample_project
  ```
- **Expected:** DB at `$HOME/.codegraphcontext/global/db/falkordb`
- **Actual:** Worker logs show `DB Path: /home/shashank/.codegraphcontext/global/db/falkordb` and socket at same real-home path despite isolated `HOME`.
- **Impact:** Multi-user/multi-env isolation broken; stale sockets in one profile break all FalkorDB users on the machine.

---

### BUG-002: FalkorDB failure silently returns exit code 0 on query commands
- **Severity:** Critical
- **Category:** UX
- **Backend(s):** falkordb (when worker fails)
- **Repro steps:**
  ```bash
  export HOME=/tmp/cgc-exit-audit-$(date +%s)
  cgc config db falkordb
  cgc find name f1   # with stale/broken falkordb.sock in real home
  echo $?            # prints 0
  ```
- **Expected:** Non-zero exit + clear error to stderr
- **Actual:** `Database Connection Error: ... not a valid Kuzu database file!` in logs; **exit code 0**, no table output.
- **Impact:** Scripts and CI think commands succeeded; AI agents get empty results.

---

### BUG-003: `cgc analyze chain f1 f3` fails on known call chain
- **Severity:** Critical
- **Category:** Accuracy
- **Backend(s):** kuzudb, ladybugdb, falkordb-remote
- **Repro steps:**
  ```bash
  cgc index --force tests/fixtures/sample_projects/sample_project
  cgc analyze chain f1 f3
  ```
  (`function_chains.py` contains `result = f1(f2(f3(10)))`)
- **Expected:** Chain `f1 → f2 → f3` (or equivalent)
- **Actual:** `No call chain found between 'f1' and 'f3' within depth 5`
- **Impact:** Core value proposition (call-path tracing) fails on trivial nested-call example.

---

### BUG-004: `cgc analyze calls f1` reports no callees
- **Severity:** High
- **Category:** Accuracy
- **Backend(s):** kuzudb
- **Repro steps:**
  ```bash
  cgc index --force tests/fixtures/sample_projects/sample_project
  cgc analyze calls f1
  ```
- **Expected:** `f2` listed as callee (via `f1(f2(f3(10)))`)
- **Actual:** `No function calls found for 'f1'`
- **Impact:** Callee analysis unusable for module-level call patterns.

---

### BUG-005: `cgc analyze callers f2` attributes caller to `<module>` instead of `f1`
- **Severity:** High
- **Category:** Accuracy
- **Backend(s):** kuzudb, ladybugdb, falkordb-remote, MCP
- **Repro steps:**
  ```bash
  cgc analyze callers f2
  ```
- **Expected:** Caller function `f1` at `function_chains.py`
- **Actual:** Caller shown as `<module>` at line 1; MCP `analyze_code_relationships` returns identical wrong attribution.
- **Impact:** Misleading call graphs; refactoring impact analysis wrong.

---

### BUG-006: `cgc bundle import` fails on KuzuDB with INTERNAL_ID type mismatch
- **Severity:** High
- **Category:** Accuracy / UX
- **Backend(s):** kuzudb
- **Repro steps:**
  ```bash
  cgc config db kuzudb
  cgc index --force tests/fixtures/sample_projects/sample_project
  cgc bundle export /tmp/test.cgc --repo <sample_project_path>
  echo y | cgc bundle import /tmp/test.cgc --clear
  ```
- **Expected:** Round-trip import restores 456 nodes / 628 edges
- **Actual:** `Import failed: Binder exception: Type Mismatch: Cannot compare types INTERNAL_ID and STRUCT(offset INT8, table INT8)`; exit 1.
- **Impact:** Portable bundles unusable on default KuzuDB backend.

---

### BUG-007: Per-repo context mode indexes into CWD repo, not target path
- **Severity:** High
- **Category:** Accuracy
- **Backend(s):** all (observed with falkordb in per-repo mode)
- **Repro steps:**
  ```bash
  export HOME=/tmp/cgc-ctx-test
  cgc context mode per-repo
  # Run from inside CodeGraphContext repo (which gets .codegraphcontext auto-created):
  cgc index /tmp/cgc-repo-a   # contains def alpha(): pass
  cgc index /tmp/cgc-repo-b   # contains def beta(): pass
  cd /tmp/cgc-repo-b && cgc find name beta
  ```
- **Expected:** `beta` found in repo B's local DB; `alpha` not visible from repo B
- **Actual:** First index used `CodeGraphContext/.codegraphcontext`; no `.codegraphcontext` under `/tmp/cgc-repo-a`; `find name beta` → `No code elements found`; `find name alpha` also not found.
- **Impact:** Per-repo isolation — a primary documented mode — does not work as described when invoked from a parent repo.

---

### BUG-008: `cgc config set FALKORDB_HOST` rejected — remote config only via env vars
- **Severity:** High
- **Category:** Docs / UX
- **Backend(s):** falkordb-remote
- **Repro steps:**
  ```bash
  cgc config db falkordb-remote
  cgc config set FALKORDB_HOST 127.0.0.1
  ```
- **Expected:** Key accepted (per `docs/docs/reference/config.md`)
- **Actual:** `❌ Unknown config key: FALKORDB_HOST` — only `FALKORDB_PATH`, `FALKORDB_SOCKET_PATH` listed.
- **Workaround:** `export FALKORDB_HOST=127.0.0.1` before commands.
- **Impact:** New users following docs cannot configure remote FalkorDB via `cgc config`.

---

### BUG-009: `cgc doctor` passes for `falkordb-remote` without `FALKORDB_HOST`
- **Severity:** High
- **Category:** UX
- **Backend(s):** falkordb-remote
- **Repro steps:**
  ```bash
  cgc config db falkordb-remote
  cgc doctor
  ```
- **Expected:** Warning/fail — host not configured
- **Actual:** `✅ All diagnostics passed!` but subsequent `cgc index` fails with `FALKORDB_HOST is not set` (exit 0).
- **Impact:** False confidence during onboarding.

---

### BUG-010: MCP `add_code_to_graph` with invalid path returns empty response
- **Severity:** High
- **Category:** UX / Accuracy
- **Backend(s):** all (MCP)
- **Repro steps:** Send MCP `tools/call` for `add_code_to_graph` with `path: "/nonexistent/xyz"`.
- **Expected:** `{"success": false, "error": "path not found"}` or similar
- **Actual:** Empty JSON body in tool response (`{}`); no error surfaced to client.
- **Impact:** AI agents believe indexing succeeded or hang waiting for job_id.

---

### BUG-011: `cgc clean` removes 169 orphaned nodes immediately after fresh index
- **Severity:** High
- **Category:** Accuracy
- **Backend(s):** kuzudb, ladybugdb
- **Repro steps:**
  ```bash
  cgc index --force sample_project
  cgc clean
  ```
- **Expected:** 0 orphans (or minimal) on freshly indexed graph
- **Actual:** `Deleted 169 orphaned nodes total` (~37% of 456 nodes)
- **Impact:** Graph may be missing relationships; indicates indexing leaves dangling nodes.

---

### BUG-012: Read-only `cgc query` violation returns exit code 0
- **Severity:** Medium
- **Category:** UX
- **Backend(s):** kuzudb
- **Repro steps:**
  ```bash
  cgc query "CREATE (n:Hack) RETURN n"
  echo $?
  ```
- **Expected:** Exit 1
- **Actual:** `Error: This command only supports read-only queries.` but **exit 0**
- **Impact:** Automation cannot detect blocked write attempts.

---

### BUG-013: KuzuDB indexing ~15–20× slower than documented FalkorDB baseline
- **Severity:** Medium
- **Category:** Performance
- **Backend(s):** kuzudb
- **Repro steps:** `time cgc index --force sample_project` on KuzuDB
- **Expected:** ~1–2s (per `docs/test_report.md`: FalkorDB 1.28s for 36 files)
- **Actual:** **16.8–27.7s** for same fixture (44 files)
- **Impact:** Poor first-run experience when FalkorDB unavailable and Kuzu is fallback.

---

### BUG-014: FalkorDB worker retry storm adds ~500ms+ latency per command
- **Severity:** Medium
- **Category:** Performance
- **Backend(s):** falkordb (broken state)
- **Repro steps:** Run any `cgc` command with broken falkordb.sock
- **Expected:** Fast fail with one error
- **Actual:** 10+ retry cycles logged per invocation (`FalkorDB Lite not functional... Falling back to KùzuDB` repeated)
- **Impact:** Every CLI call slow when FalkorDB misconfigured.

---

### BUG-015: MCP `initialize` response embeds full system prompt (~10KB+)
- **Severity:** Medium
- **Category:** Performance
- **Backend(s):** MCP
- **Repro steps:** `cgc mcp start` → send `initialize` JSON-RPC
- **Expected:** Compact server metadata
- **Actual:** `result.serverInfo.systemPrompt` contains entire AI instruction document inline
- **Impact:** Slow MCP handshake; wasted tokens if clients log responses.

---

### BUG-016: `cgc bundle import --clear` requires interactive confirmation
- **Severity:** Medium
- **Category:** UX
- **Backend(s):** all
- **Repro steps:** `cgc bundle import foo.cgc --clear` (non-TTY or CI)
- **Expected:** `--yes` flag or non-interactive default with explicit opt-in
- **Actual:** `Are you sure you want to continue? [y/N]: Aborted.` when stdin not TTY
- **Impact:** Bundle workflows fail in scripts/CI without `echo y |` hack.

---

### BUG-017: `--db-path` runtime override fails on KuzuDB
- **Severity:** Medium
- **Category:** UX
- **Backend(s):** kuzudb
- **Repro steps:**
  ```bash
  cgc --db kuzudb --path /tmp/my-db index /tmp/some-repo
  ```
- **Expected:** DB created at `/tmp/my-db`
- **Actual:** `Database Connection Error: Database path cannot be a ...`
- **Impact:** Documented global flag non-functional for path override.

---

### BUG-018: Project `.codegraphcontext/.env` overrides isolated test HOME config
- **Severity:** Medium
- **Category:** UX / Accuracy
- **Backend(s):** all
- **Repro steps:** Run `cgc` from CodeGraphContext repo root with `export HOME=/tmp/isolated` after per-repo mode created `CodeGraphContext/.codegraphcontext/`
- **Expected:** Isolated HOME config used
- **Actual:** Log shows `DEFAULT_DATABASE defined in multiple sources ... using: CodeGraphContext/.codegraphcontext/.env` and switches to per-repo FalkorDB.
- **Impact:** Tests and tooling from within the repo get unexpected backend/context.

---

### BUG-019: `cgc report` includes cross-repo noise from global DB
- **Severity:** Medium
- **Category:** Accuracy
- **Backend(s):** kuzudb
- **Repro steps:** Index only `sample_project`; run `cgc report`
- **Expected:** Report scoped to indexed repo
- **Actual:** Report lists Go functions (`sample_project_go/error_handling.go`) not present in Python fixture.
- **Impact:** Misleading audit reports for new users.

---

### BUG-020: Bundle export logs ERROR for `SHOW CONSTRAINTS` / `CALL db.labels()` on non-Neo4j backends
- **Severity:** Medium
- **Category:** UX
- **Backend(s):** kuzudb, ladybugdb, falkordb
- **Repro steps:** `cgc bundle export out.cgc`
- **Expected:** Clean export or backend-specific schema extraction
- **Actual:** Multiple `Query failed: SHOW CONSTRAINTS... Parser exception` ERROR lines; export still succeeds.
- **Impact:** Users think export is broken; log noise hides real errors.

---

### BUG-021: Edge count drift (+1) vs golden baseline
- **Severity:** Low
- **Category:** Accuracy
- **Backend(s):** kuzudb, falkordb-remote
- **Repro steps:** Index + export `sample_project`
- **Expected:** 628 edges (golden)
- **Actual:** **629 edges** consistently
- **Impact:** Minor regression-detection noise; may indicate extra spurious edge.

---

### BUG-022: Global `--database` help omits `ladybugdb` and `nornic`
- **Severity:** Low
- **Category:** Docs
- **Backend(s):** all
- **Repro steps:** `cgc --help`
- **Expected:** All 6 backends listed
- **Actual:** Only `falkordb, falkordb-remote, neo4j, kuzudb`; `cgc config db --help` **does** list `ladybugdb`.
- **Impact:** Users don't discover LadybugDB from top-level help.

---

### BUG-023: Docs claim `find content` unsupported on FalkorDB — it works
- **Severity:** Low
- **Category:** Docs
- **Backend(s):** falkordb
- **Repro steps:** `cgc config db falkordb` → index → `cgc find content "Hello"`
- **Expected (per skill/docs):** User-facing error on FalkorDB
- **Actual:** `Found 12 content match(es) for 'Hello'`
- **Impact:** Documentation/skill guidance is stale or wrong.

---

### BUG-024: MCP tool count documentation inconsistent (21 vs 25)
- **Severity:** Low
- **Category:** Docs
- **Repro steps:** `cgc mcp tools` or MCP `tools/list`
- **Expected:** Consistent count across docs
- **Actual:** Code registers **25** tools; `docs/MCP_TOOLS.md` says 21; `docs/docs/reference/mcp.md` says 25.
- **Impact:** Confusion for MCP integrators.

---

### BUG-025: Context docs default fallback says KuzuDB; runtime default is FalkorDB on Linux
- **Severity:** Low
- **Category:** Docs
- **Repro steps:** Fresh install `cgc doctor` on Linux Py3.12
- **Expected (per `docs/docs/guides/contexts.md`):** Fallback `~/.codegraphcontext/global/db/kuzudb/`
- **Actual:** `Using database: falkordb` as default on first run.
- **Impact:** New users look in wrong directory for DB files.

---

### BUG-026: Onboarding "Welcome to CodeGraphContext" banner on first command per fresh HOME
- **Severity:** Low
- **Category:** UX
- **Repro steps:** Any first `cgc` command in new `HOME` (including failed `find`)
- **Expected:** Banner only on `cgc` with no args or `cgc doctor`/setup
- **Actual:** Multi-line welcome + context explanation injected before operation (even errors).
- **Impact:** Noisy output for scripting; repeats per isolated environment.

---

### BUG-027: `cgc cypher` deprecated alias works but is easy to miss
- **Severity:** Low
- **Category:** UX
- **Backend(s):** kuzudb
- **Repro steps:** `cgc cypher "MATCH (n) RETURN count(n) LIMIT 1"`
- **Expected:** Deprecation warning + result
- **Actual:** `⚠️ 'cgc cypher' is deprecated. Use 'cgc query' instead.` — works correctly (PASS).
- **Impact:** Minor — alias still functional (not a blocker).

---

### BUG-028: Neo4j Docker setup blocked by port conflict
- **Severity:** Low (environment)
- **Category:** UX
- **Repro steps:** `docker run -p 7687:7687 neo4j:5` per docs
- **Expected:** Clean Neo4j test instance
- **Actual:** `Bind for 0.0.0.0:7687 failed: port is already allocated` (existing `neo4j-cgc`); auth failed with `testpassword`.
- **Impact:** Cannot verify Neo4j path without manual cleanup/password discovery. Document should mention port conflicts.

---

### BUG-029: Nornic backend not testable — no setup wizard or `cgc config db nornic`
- **Severity:** Low
- **Category:** Docs / UX
- **Repro steps:** `cgc config db nornic`
- **Expected:** Supported per code exploration
- **Actual:** Not in `cgc config db` choices; no instance available.
- **Impact:** Sixth backend effectively undocumented for new users.

---

### BUG-030: `cgc registry search` returns success with empty/unhelpful output in isolated env
- **Severity:** Low
- **Category:** UX
- **Repro steps:** `cgc registry search numpy` (exit 0)
- **Expected:** Results or clear "network required" message
- **Actual:** Exit 0 from isolated test (needs network verification).
- **Impact:** Low priority; registry may need online access not documented at install time.

---

## Doc / UX Inconsistencies (Summary)

| Item | Docs say | Observed |
|------|----------|----------|
| Default backend (Linux) | KuzuDB fallback path | FalkorDB Lite |
| `find content` on FalkorDB | Unsupported / error | Works (12 matches) |
| MCP tool count | 21 (MCP_TOOLS.md) | 25 (code) |
| `--database` backends | 4 in `cgc --help` | 6 in code (`ladybugdb`, `nornic` missing from global help) |
| FalkorDB remote config | `cgc config set FALKORDB_HOST` | Key unknown; env vars only |
| Per-repo mode | Creates `.codegraphcontext/` in indexed repo | Uses CWD repo when run from inside another initialized repo |
| Index performance | ~1.3s (FalkorDB, 36 files) | 17–27s on KuzuDB |

---

## Skipped Tests

| Test | Reason |
|------|--------|
| **Neo4j full E2E** | Port 7687 occupied by existing `neo4j-cgc` container; `neo4j/testpassword` auth failed |
| **Nornic** | No Nornic server; not in `cgc config db` wizard |
| **VS Code extension** | Out of scope (CLI/MCP E2E only) |
| **`cgc visualize` / `cgc api start`** | Not run (browser/server interaction; no headless verification in this pass) |
| **`cgc watch` incremental** | Not run (long-running daemon) |
| **Golden `metadata.json` parity** | On-disk goldens lack `graph_metrics` in published tree; used export counts vs prior dev baseline instead |

---

## CLI / MCP Parity Matrix

| Operation | CLI | MCP | Match? |
|-----------|-----|-----|--------|
| Find `f1` | Table with `f1` at `function_chains.py:1` | `find_code` returns `f1` with path | ✅ |
| Callers of `f2` | Caller = `<module>` | `find_callers` caller = `<module>` | ✅ (both wrong) |
| List repos | `cgc list` shows sample_project | `list_indexed_repositories` same path | ✅ |
| Cypher read | `cgc query` JSON array | `execute_cypher_query` (not fully probed) | — |
| Index bad path | N/A (CLI would error) | `add_code_to_graph` empty `{}` | ❌ |
| Tool count | `cgc mcp tools` ~25 rows | `tools/list` → 25 | ✅ |

---

## Recommendations for New Users (Workarounds)

1. **If FalkorDB fails:** `rm -rf ~/.codegraphcontext/global/db/falkordb*` then `cgc config db kuzudb`, or use `--db kuzudb` explicitly.
2. **FalkorDB Remote:** Use env vars: `export FALKORDB_HOST=127.0.0.1 FALKORDB_PORT=6379`.
3. **Do not trust exit codes** on `find`/`analyze`/`query` — verify stdout has results.
4. **Call-chain queries:** Use `cgc query` with custom Cypher until `analyze chain` is fixed.
5. **Bundles:** Export works; import on KuzuDB broken in 0.4.15 — re-index instead of importing.
6. **Per-repo mode:** `cd` into target repo before `cgc index .`; avoid running from a parent repo that already has `.codegraphcontext/`.

---

## Test Artifacts

| Path | Contents |
|------|----------|
| `/tmp/cgc-e2e-venv/` | PyPI venv with `codegraphcontext==0.4.15` |
| `/tmp/cgc-e2e-results/falkordb.log` | FalkorDB failure logs |
| `/tmp/cgc-e2e-results/kuzudb.log` | Full KuzuDB command suite |
| `/tmp/cgc-e2e-results/ladybugdb.log` | Full LadybugDB command suite |
| `/tmp/cgc-e2e-results/phase2.log` | Context modes, exit codes, MCP tools list |
| `/tmp/cgc-e2e-results/mcp_calls.json` | MCP tool call responses |
| `/tmp/cgc-e2e-results/lang_sweep.csv` | Language sweep (contaminated run — see BUG-018) |
| `/tmp/cgc_e2e_harness.sh` | Backend test harness (external, not repo source) |

---

*Report generated by E2E bug hunt plan execution. No source code was modified.*
