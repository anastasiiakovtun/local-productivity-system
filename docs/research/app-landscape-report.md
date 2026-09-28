# To-do + focus/time-tracking app landscape

**Research target:** an MVP for individual knowledge workers who keep durable knowledge in Obsidian. “Unnecessary” below means unnecessary *for that MVP*, not universally bad.

## Decision summary

Across the six products, the repeatable core is small: capture a task quickly, decide when it matters, choose one task, run or record a focus interval, correct the record, and review a small amount of history. The clearest bloat risk is rebuilding project knowledge, collaboration, billing, habits, or elaborate analytics that Obsidian or specialist tools already cover.

**MVP baseline:** global keyboard capture; Inbox/Today/Upcoming; projects or areas; due date plus a separate “start/available” date; recurrence/reminders; subtasks; task-linked stopwatch/Pomodoro; pause/skip/extend; manual correction; daily/weekly totals; local Markdown logging; links back to Obsidian notes.

## To-do apps

### 1. Todoist — broad, fast, cross-platform task execution

**Essential**
- Quick Add is the strongest pattern to copy: one entry field can parse natural-language dates/times and add project, label, priority, reminder, and deadline metadata.[16]
- Due dates, reminders, priorities, subtasks, labels/projects, filters, and recurring tasks form the execution spine; completing a recurring task advances it automatically.[17][18]
- The free plan’s five projects, three filters, list/board views, and calendar/email integrations demonstrate that the usable core does not require the full paid feature set.[18]

**Useful, but not essential initially**
- Task duration, deadlines distinct from dates, calendar layout, and a few custom filters can improve planning once users outgrow a simple Today/Upcoming workflow.[18]
- Integrations are useful for capture and handoff, but a native `obsidian://` link is more important to this audience than reproducing Todoist’s entire integration catalog.

**Likely bloat for this MVP**
- 150 filters, full reporting history, AI/assist features, large file storage, and productivity visualizations add configuration and reporting surface before the core loop is proven.[18]
- Team workspaces, permissions, activity logs, shared templates, guests, and centralized billing solve a different job from individual execution.[18]

### 2. Things 3 — opinionated personal planning with low visual complexity

**Essential**
- Copy the constrained execution model: Today, Upcoming, Anytime, and Someday keep actionable work separated by when it can be started.[20]
- Preserve the distinction between a start date and a deadline. Things hides future work until its start date, while a deadline records when it must be finished; this prevents the common “everything is due today” failure mode.[20]
- Areas/projects, headings, tasks, checklists, tags, reminders, repeats, and a calendar-adjacent Today view provide enough structure without becoming a knowledge base.[19]

**Useful, but not essential initially**
- Showing calendar events beside tasks is useful context, as are lightweight task notes and deep links back to project material in Obsidian.[19]
- “This Evening” is a useful optional partition, but it is a refinement rather than a launch requirement.[19]

**Likely bloat for this MVP**
- Do not copy Things’ platform-wide polish surface—special gestures, many device-specific experiences, elaborate animation, and extensive visual detailing—before capture, planning, and logging are reliable.[19]
- Rich research notes, backlinks, attachments, and graph views would duplicate Obsidian rather than improve the task layer.

### 3. TickTick — an all-in-one power-user suite

**Essential**
- Its free core validates the baseline: natural-language capture, reminders, cross-platform sync, lists, Kanban, priorities, tags, subtasks, recurrence, and filters.[2][3]
- A task-linked focus timer and review by date/list/tag/task are especially relevant because they connect intention to actual effort.[6]

**Useful, but not essential initially**
- Calendar/time-blocking, task duration, external-calendar overlays, and a compact estimated-versus-actual review can help users plan capacity.[2]
- Kanban is useful for some project types, but should be an alternate view over the same task data—not a second system.[2]

**Likely bloat for this MVP**
- Habits, countdowns, Eisenhower Matrix variants, achievements, themes, AI features, collaboration, and extensive templates widen the product into a general productivity suite.[2]
- TickTick’s feature breadth is evidence that the combined category already exists; simply adding tasks plus Pomodoro is not differentiation.

## Pomodoro/time-tracking apps

### 4. Toggl Track — accurate time records and reporting

**Essential**
- Support both a live timer and manual entry, then let users repair description, project, tags, duration, timestamps, and date. Real use includes forgotten starts, late stops, and context changes.[21]
- Use one lightweight project plus optional tags; Toggl’s own hierarchy shows that clients and paid “tasks” are extra layers around the actual time entry.[22]
- A summary that answers “how much time did I track for this activity?” by date range is enough for an initial feedback loop.[23]

**Useful, but not essential initially**
- Built-in Pomodoro, offline desktop capture, calendar context, idle detection, and export can reduce friction.[21][24][25]
- A private, opt-in reconstruction aid may help fill gaps, but it should not be required.

**Likely bloat for this MVP**
- Clients, billable rates, invoices, revenue, estimates, profitability, utilization, approvals, SSO, audit logs, and team administration belong to agency/freelance or enterprise jobs.[22][25]
- Tracking every viewed app/site risks privacy cost and data noise; it is not necessary to prove the personal focus loop.[25]

### 5. Focus To-Do — the clearest task → estimate → timer → actual loop

**Essential**
- Its core sequence is explicit: pick a task, run a 25-minute timer, take a break; it supports pause/resume, custom work/break lengths, long breaks, skipping, and continuous mode.[11]
- Estimated Pomodoro count plus actual focus time is a strong planning primitive, supported by projects, priorities, recurrence, reminders, and subtasks.[11]
- Daily/weekly project-time totals and completed-task counts are sufficient initial analytics.[11][26]

**Useful, but not essential initially**
- Offline local mode, optional account sync, editable records, and cross-device access are valuable trust and continuity features.[15]
- White noise or strict blocking may help a subset of users, but should remain optional.[11]

**Likely bloat for this MVP**
- Full schedule planning, habit tracking, long notes, Gantt charts, elaborate trends, rankings, and a media/white-noise library expand beyond the focus loop.[11]
- A second rich task database would compete with the vault rather than act as its execution layer.

### 6. Session — intentional focus plus blocking and reflection

**Essential**
- Require or strongly encourage a short intention before starting; then support focus, break, pause, completion, and a clear end notification.[27]
- Flexible durations and “overflow” preserve work when the user reaches flow instead of discarding or forcibly interrupting the session.[27]
- Save minimal history: intention, category/project, duration, and optional one-line outcome.[27]

**Useful, but not essential initially**
- App/site blocking, calendar context, daily/weekly/monthly review, keyboard shortcuts, and automation can meaningfully reduce start friction.[27][28]
- Export or automation is especially useful if it writes a small record into an Obsidian daily note rather than creating another journal.[28]

**Likely bloat for this MVP**
- Slack status, music/smart-light automation, many widgets and device controls, rich reflection notes, numerous category profiles, and remote multi-device control are power features, not table stakes.[27][28]
- Session’s paid surface also shows how quickly a timer can become an automation platform.[28]

## Current discussion: last-30-days check

The last30days run covered **27 August–26 September 2026** and was thin. It found three relevant to-do threads on Reddit, no relevant Hacker News results, and no available YouTube lane in this environment. The surfaced discussion included a Things thread about slow feature delivery and a highly engaged TickTick thread about missing features; these are evidence of active feature-pressure, not proof that any specific feature is broadly required.[29][30]

For focus apps, the run found six Reddit threads, but the strongest recent bloat/privacy signals were low-engagement, often self-promotional posts: one explicitly framed existing Pomodoro apps as bloated/paywalled, and another proposed attention checking beyond a simple timer.[31][32] The relevant HN example I could verify was seven months old and had one point; it is useful only as a product-landscape signal that Obsidian/task-manager integration and a low-friction command palette already exist—not as current sentiment.[33]

**Interpretation:** current community evidence is too thin to rank the six products by satisfaction. It does support caution about feature accumulation, paywalling basic timer controls, and extra steps between selecting a task and beginning focus.[31][33]

## Two differentiated product ideas

### 1. Vault-native “resume packet,” not merely Obsidian sync

At session start, resolve the task’s `obsidian://` link and show a tiny, local resume packet: the last session’s outcome, the next-action line, and the two or three note links touched previously. At session end, append a Markdown checkpoint to the originating note and daily note: planned effort, actual focus, interruption count, outcome, and next action.

**Why this is different:** the sampled products capture tasks, timers, notes, integrations, or exports, and the HN competitor already pulls tasks from Obsidian.[21][27][33] The proposed value is a closed continuity loop—*restore context before work and leave recoverable context afterward*—rather than another task import, generic time log, or duplicate notes database. This uniqueness remains a hypothesis until tested against more competitors.

### 2. Privacy-preserving context-switch ledger

During a session, detect only explicit task/note switches inside your app (not every website or keystroke). If the active Obsidian note or selected task changes, offer one-key choices: “switch task,” “log interruption,” or “ignore.” The weekly vault note then reports fragmented projects, restart cost, and abandoned handoffs—without surveillance-style desktop history.

**Why this is different:** Toggl can capture broad app/site activity, while existing focus products emphasize timers, blocking, streaks, or aggregate analytics.[25][27] A user-controlled Markdown trail of *intentional handoffs* would target the reconstruction cost of knowledge work while preserving local ownership and avoiding an exhaustive activity feed.

## Product-strategy checks

- **JTBD hypothesis (3/10 evidence):** “When I turn an Obsidian note into work, I want to choose the next action, start focusing with almost no setup, and leave a durable checkpoint, so I can resume later without reconstructing context.” Functional fit is plausible, but emotional/social dimensions, switching forces, and repeated-use behavior have not been interviewed.
- **Positioning strength (5/10):** the target customer and “Obsidian-native execution layer” category are clear; the proposed resume/context-switch attributes appear differentiated in this six-app sample, but the “only we” claim and customer value are not yet proven.

## Sources

[2] https://ticktick.com/about/upgrade — TickTick Premium official pricing
[3] https://help.ticktick.com/articles/7055782422935240704 — TickTick Help: Add Tasks
[6] https://help.ticktick.com/articles/7055781966800486400 — TickTick Help: Focus Statistics
[11] https://apps.microsoft.com/detail/9n8gpb2tk8gb?gl=US&hl=en-US — Focus To-Do Microsoft Store listing
[15] https://focustodo.cn/privacy-policy — Focus To-Do privacy policy
[16] https://www.todoist.com/help/todoist/features/use-task-quick-add-in-todoist-va4Lhpzz
[17] https://www.todoist.com/help/todoist/features/introduction-to-recurring-dates-YUYVJJAV
[18] https://www.todoist.com/pricing
[19] https://culturedcode.com/things/features
[20] https://culturedcode.com/things/support/articles/2803579
[21] https://support.toggl.com/toggl-track-desktop-app-for-macos
[22] https://support.toggl.com/en-us/article/data-structure-in-toggl-track-14d14io
[23] https://support.toggl.com/en-us/article/summary-report-1emjk2m
[24] https://support.toggl.com/how-to-enable-the-pomodoro-timer
[25] https://toggl.com/track/pricing
[26] https://focustodo.cn/?lang=en_US
[27] https://stayinsession.com/learn/getting-started-with-session-pomodoro-app
[28] https://stayinsession.com/pricing
[29] https://www.reddit.com/r/thingsapp/comments/1wpvamo/why_things_wont_release_new_features
[30] https://www.reddit.com/r/ticktick/comments/1w5kdil/the_features_ticktick_still_doesnt_have_so_i
[31] https://www.reddit.com/r/pomodoro/comments/1wqs3jt/i_got_tired_of_bloated_pomodoro_apps_locking
[32] https://www.reddit.com/r/pomodoro/comments/1wq257k/my_tesla_kept_telling_me_to_pay_attention_so_i
[33] https://news.ycombinator.com/item?id=47088626

**Found:** The defensible MVP is a thin task-execution and focus layer—fast capture, Today/Upcoming planning, start dates versus deadlines, task-linked timing, manual correction, and a small review—while Obsidian remains the knowledge system. The strongest differentiation hypotheses are context restoration and privacy-preserving handoff logging, not another generic task-plus-Pomodoro bundle.[20][21][33]
**Uncertain:** Recent Reddit/HN evidence was sparse, YouTube was unavailable to the last30days runner, the two custom ideas were checked only against this six-app sample plus one adjacent HN product, and no customer interviews validate the inferred job or willingness to switch.
**Next step:** Prototype the resume packet and test it in five observed Obsidian workflows before expanding the MVP beyond the shared baseline.