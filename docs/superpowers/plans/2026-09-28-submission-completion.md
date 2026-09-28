# Submission Completion Implementation Plan

## Task 1: Lock scope and delivery

- Create `docs/submission-package` from current `main`.
- Commit the approved design and this plan.
- Keep AI usage and reflection as student-owned placeholders.

Verification: clean branch status after commit.

## Task 2: Complete task Markdown fields

- Add failing tests for date, time, UTC offset, timezone, event, status, task ID/title, and changed details in `Activity.md`.
- Update the task-event Markdown formatter minimally.
- Run targeted and full tests.
- Commit task logging changes.

## Task 3: Complete focus Markdown fields and log starts

- Add failing tests for `session_started`, completed, and abandoned records.
- Route session starts through an append-only Focus Log writer.
- Standardize all focus records on the required field labels.
- Run targeted and full tests.
- Commit focus logging changes.

## Task 4: Expose break-duration control

- Add failing renderer tests for changing a 1–60 minute break duration and persisting the preference.
- Add the smallest UI and store wiring needed.
- Run targeted and full tests.
- Perform packaged visual verification.
- Commit the setting.

## Task 5: Add lifecycle verification

- Add a restart-persistence test using the same persistent data directory.
- Add an offline packaged startup test that rejects network requests.
- Run both tests against the packaged application.
- Commit verification coverage.

## Task 6: Produce cited research and Grill evidence

- Retrieve official sources for three task managers and three timer products.
- Record sources in the citation ledger before drafting.
- Write `docs/research/product-research.md` with feature classification and product implications.
- Verify all citations against the ledger.
- Write `docs/research/product-grill.md` with challenges and resulting decisions.
- Commit research and Grill evidence.

## Task 7: Repair project documentation

- Replace README clone placeholder with the actual repository URL.
- Document complete Markdown formats, validation commands, and offline/local-data behavior.
- Rewrite `docs/PROJECT-STATUS.md` to current state.
- Add a per-file artifact decision map for all files in `reference/`.
- Commit documentation updates.

## Task 8: Generate submission sample

- Create an isolated test vault.
- Launch or invoke the packaged application's real persistence workflow to create, edit, complete, reopen, and delete a task and to start and finish/abandon focus sessions.
- Copy the generated Markdown records into `Anastasiia_Kovtun_3IXD_Dev5_Obsidiansample.md` with provenance notes outside generated blocks if needed.
- Verify required fields and append-only chronology.
- Commit the sample.

## Task 9: Assemble report and PDF

- Create `docs/submission/Anastasiia_Kovtun_3IXD_Dev5_PRD.md`.
- Include research, PRD summary, decisions, artifact images, and vault examples.
- Leave explicit AI-usage and reflection placeholders for Anastasiia.
- After Anastasiia provides both sections, generate `Anastasiia_Kovtun_3IXD_Dev5_PRD.PDF`.
- Extract PDF text and render pages for visual inspection.
- Commit source and verified PDF only when complete.

## Task 10: Final quality gates

- Run the complete test suite.
- Run package verification and packaged smoke tests.
- Inspect the final app and generated documents visually.
- Run independent whole-branch review against `main`.
- Fix blocking findings with tests first.
- Present commit list and requirement matrix before requesting merge approval.
