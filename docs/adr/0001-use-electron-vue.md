---
status: accepted
---

# Use Electron with Vue for the desktop application

The application will use Electron as its sole desktop framework, with Vue 3, the Composition API, Pinia, Vite, and plain JavaScript in the renderer. Tauri was considered but rejected because its Rust backend and toolchain would add substantial learning and debugging risk within the assignment timeline; Electron keeps the implementation in the JavaScript ecosystem already familiar to the developer, allowing effort to remain focused on the product's task, focus-session, resume-packet, and Obsidian-integration behavior.

## Considered options

- **Tauri 2:** offered a smaller package and strong capability-based filesystem controls, but required learning Rust for security-sensitive Vault access, file watching, timer recovery, and native integration work.
- **Electron:** produces a larger application and requires deliberate IPC security, but provides the needed macOS and Windows desktop capabilities through familiar JavaScript APIs and a mature packaging ecosystem.

## Consequences

The renderer uses Vue 3 with the Composition API, Pinia, Vite, and plain JavaScript. Electron Forge owns packaging and uses its Vite plugin to build the main process, preload script, and renderer separately. Because Forge's Vite integration may introduce breaking changes, exact dependency versions and the package-manager lockfile are committed and upgrades are deliberate.

The main process owns privileged filesystem, SQLite, timer, notification, tray, shortcut, and window operations. SQLite uses `better-sqlite3` behind a dedicated persistence module and is rebuilt and packaged for Electron on each target platform. The Vue renderer receives only narrow, task-specific APIs through an isolated preload script and `contextBridge`; Node integration is disabled, context isolation and sandboxing are enabled, IPC senders and payloads are validated with reusable runtime schemas, and arbitrary IPC, SQL, or filesystem access is never exposed.

A formal technical spike must prove Vault path containment, guarded Markdown writes, conflict detection, filesystem watching without self-write loops, SQLite packaging, global shortcuts, notifications, tray behavior, compact always-on-top timer behavior, crash recovery, and a Windows CI package build before full product-screen development begins.

macOS 15.6 on Apple silicon is the only manually verified MVP target. The code remains platform-neutral, and Windows CI produces an unsigned x64 artifact as build-portability evidence, but Windows runtime behavior is labeled build-verified rather than manually tested. Signing, notarization, store distribution, automatic updates, cloud crash reporting, installer localization, Intel Mac testing, and remote web content are outside the MVP.
