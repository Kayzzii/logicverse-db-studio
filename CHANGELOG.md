# Changelog

All notable changes to LogicVerse DB Studio will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.2] - 2026-07-03

### Fixed
- Splash screen emergency timeout for Windows compatibility
- Custom brand assets: app icon, logo, installer images

## [0.1.1] - 2026-07-03

### Fixed
- Splash screen timeout for Windows (blank screen on launch)

## [0.1.0] - 2026-07-03

### Added
- **Database Support**: PostgreSQL, MySQL, SQLite with native driver pools
- **Query Editor**: CodeMirror 6 with SQL syntax highlighting and autocompletion
- **Schema Browser**: Tree navigation with lazy loading, type badges, PK/FK indicators
- **Results Viewer**: Virtualized table with sorting, filtering, copy, and export (CSV/JSON/SQL)
- **Multiple Tabs**: Independent query tabs with rename support
- **Query History**: Persisted to disk, click to reload
- **Saved Queries**: Save/load with Ctrl+S
- **Table Data Viewer**: Double-click table for paginated SELECT * browsing
- **EXPLAIN ANALYZE**: Visual query plan with color-coded performance indicators
- **ER Diagrams**: Auto-generated SVG relationship diagrams per schema
- **SSH Tunnel**: Connect to remote databases through SSH with password or key auth
- **Security**: AES-256-GCM encrypted credentials stored on disk
- **Dark/Light Themes**: Catppuccin Mocha (dark) and Latte (light)
- **Menu Bar**: Full IDE-style menu with keyboard shortcuts
- **Driver Selector**: DBeaver-style database driver picker with categories
- **Splash Screen**: Branded loading screen on app startup
- **Cross-platform**: Windows (.exe/.msi), macOS (.dmg), Linux (.deb/.rpm/.AppImage)
- **CI/CD**: GitHub Actions workflow for automated multi-platform releases
