# VastuPlan 2D - Changelog

All notable changes to VastuPlan 2D will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2024-12-10

### Added

#### Keyboard & Accessibility

- Added skip link for keyboard navigation
- Added tabIndex and aria-label attributes to interactive elements
- Added focus-visible styles for better keyboard navigation

#### Keyboard Shortcuts

- Ctrl+Z / Ctrl+Y - Undo/Redo
- Delete / Backspace - Delete selected room
- Ctrl+D - Duplicate selected room
- R - Rotate selected element by 90
- G - Toggle Vastu Grid overlay
- Ctrl+S - Export as PNG
- Ctrl+Plus / Ctrl+Minus - Zoom in/out

#### Export Features

- PDF Export - Professional PDF generation with floor numbers, client info, and custom branding
- PNG Export - High-resolution PNG export
- SVG Export - Vector format export for scaling without quality loss
- JSON Export/Import - Backup and share floor plans as JSON

#### Room Management

- Clear Floor - Button to remove all rooms from a specific floor with confirmation
- Element Duplication - Duplicate individual elements within rooms
- Snap to Grid Toggle - Control whether rooms snap to 1ft grid or allow fractional positioning

#### Data Features

- Plan Templates - Predefined templates (Small Apartment, Medium House, Large Villa)
- Version Comparison - Compare differences between project versions
- Share Plans - Generate view-only or comment mode links (includes AI analysis)

#### UI Improvements

- Progress Bar for AI analysis
- Zoom Limits - 10% to 300% zoom range
- Vastu Zone Legend
- Ruler Measurement Tool
- Input Validation - Min/max constraints for plot dimensions

### Fixed

- Room Element Rotation Bounds Constraint
- Wall Thickness Change Element Positions
- Missing GEMINI_API_KEY Validation
- Vastu Grid Overlay Rotation
- Undo/Redo History Bounds

### Changed

- Zoom limits changed from 0.5-2.0 to 0.1-3.0
- History handling improved

## [2.1.0] - 2024-12-10

### Added

#### Room Organization

- **Room Categories** - Assign rooms to categories (Living, Sleeping, Kitchen, Bathroom, etc.)
- **Room Tags** - Add custom key-value tags for room organization
- **Room Notes** - Add detailed notes to individual rooms

#### Dark Mode

- Full dark theme support
- Toggle dark mode in settings
- All UI elements styled for both light and dark themes

#### Export Improvements

- SVG Export - Vector format for scaling without quality loss
- JSON Export/Import - Backup and share floor plans
- Ruler Measurement Tool - Click-to-measure distances on canvas

### Changed

- Improved history management for undo/redo
- Enhanced AI analysis progress indicator

## [1.0.0] - 2024-10-15

- Initial release of VastuPlan 2D
- Interactive 2D floor plan design
- Vastu Shastra compliance analysis
- Multi-floor support

## [Unreleased] - Upcoming Features

### Planned

- Multi-select rooms with Shift+Click (requires refactoring selectedRoomIds)
- Collaborative editing backend deployment automation

### Notes

- Collaborative editing server is available in `server/` directory
- Multi-select requires refactoring the room selection system
