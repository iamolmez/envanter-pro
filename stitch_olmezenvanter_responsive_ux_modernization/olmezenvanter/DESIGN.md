---
name: OlmezEnvanter
colors:
  surface: '#faf8ff'
  surface-dim: '#d2d9f4'
  surface-bright: '#faf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f3ff'
  surface-container: '#eaedff'
  surface-container-high: '#e2e7ff'
  surface-container-highest: '#dae2fd'
  on-surface: '#131b2e'
  on-surface-variant: '#3e4850'
  inverse-surface: '#283044'
  inverse-on-surface: '#eef0ff'
  outline: '#6e7881'
  outline-variant: '#bec8d2'
  surface-tint: '#006591'
  primary: '#006591'
  on-primary: '#ffffff'
  primary-container: '#0ea5e9'
  on-primary-container: '#003751'
  inverse-primary: '#89ceff'
  secondary: '#505f76'
  on-secondary: '#ffffff'
  secondary-container: '#d0e1fb'
  on-secondary-container: '#54647a'
  tertiary: '#8a5100'
  on-tertiary: '#ffffff'
  tertiary-container: '#de8712'
  on-tertiary-container: '#4d2b00'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#c9e6ff'
  primary-fixed-dim: '#89ceff'
  on-primary-fixed: '#001e2f'
  on-primary-fixed-variant: '#004c6e'
  secondary-fixed: '#d3e4fe'
  secondary-fixed-dim: '#b7c8e1'
  on-secondary-fixed: '#0b1c30'
  on-secondary-fixed-variant: '#38485d'
  tertiary-fixed: '#ffdcbd'
  tertiary-fixed-dim: '#ffb86e'
  on-tertiary-fixed: '#2c1600'
  on-tertiary-fixed-variant: '#693c00'
  background: '#faf8ff'
  on-background: '#131b2e'
  surface-variant: '#dae2fd'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 34px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.02em
  mono-data:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  touch-min: 44px
  base-unit: 4px
  container-margin-mobile: 16px
  container-margin-desktop: 32px
  gutter: 16px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 24px
---

## Brand & Style
The design system is engineered for high-utility industrial environments where speed, precision, and clarity are paramount. The brand personality is professional, reliable, and "tool-like," prioritizing functional efficiency over decorative flair. 

The aesthetic leans into **Corporate Modernism** with a slight **Industrial** edge. It features a high-density information architecture balanced by generous touch targets and high-contrast visuals to ensure readability in varying lighting conditions (e.g., warehouses, loading docks, or bright offices). The UI evokes a sense of "active control"—it is a robust dashboard meant for heavy-duty operational workflows.

## Colors
The palette is rooted in functional signaling. **Industrial Blue** serves as the primary action color, providing a clear focal point for interactive elements. **Emerald** and **Rose** are reserved strictly for semantic status indicators (In-Stock/Success vs. Out-of-Stock/Critical Error) to ensure rapid cognitive processing.

The neutral scale uses **Slate**, providing a cooler, more "engineered" feel than pure greys. High contrast is maintained between background and surface layers to support legibility on mobile devices.

## Typography
This design system utilizes **Inter** for all primary UI elements due to its exceptional legibility and neutral character. For data-heavy contexts, such as SKU numbers, stock counts, and serial IDs, a monospaced font (JetBrains Mono) is introduced to prevent character jumping and ensure vertical alignment in tables.

Weight is used strategically to denote hierarchy: Semibold/Bold for headers and interactive labels, and Regular for descriptions. Line heights are generous to prevent visual crowding in dense inventory lists.

## Layout & Spacing
The layout follows a **fluid-to-fixed hybrid model**. On mobile, content uses a 100% fluid width with 16px side margins. On desktop, content is constrained to a 12-column grid with a max-width of 1440px to ensure manageable line lengths.

A strict **4px baseline grid** governs all spacing. Vertical rhythm is maintained through standardized stack tokens. Every interactive element (buttons, inputs, list items) must adhere to a **minimum 44px height** to ensure reliable operation for users wearing gloves or using mobile devices in high-activity environments.

## Elevation & Depth
Depth is conveyed through **Tonal Layering** and **Subtle Outlines** rather than heavy shadows, maintaining a clean, industrial look. 

- **Level 0 (Background):** Slate-50; the canvas.
- **Level 1 (Cards/Surface):** White; used for the primary content container. Features a 1px Slate-200 border.
- **Level 2 (Active/Raised):** White; used for modals and dropdowns. Features a soft, low-opacity shadow (0 4px 6px -1px rgb(0 0 0 / 0.1)) to differentiate from the base surface.
- **Interactive State:** Hover states use a subtle tonal shift (Slate-50) rather than a shadow increase, keeping the UI feeling "flat" and stable.

## Shapes
The shape language is **Rounded (0.5rem)**, reflecting a precise yet modern aesthetic. While the system remains serious and professional, the increased corner radius provides a smoother, more refined user experience compared to sharper industrial standards.

- **Buttons/Inputs:** 8px (rounded-md)
- **Cards/Containers:** 16px (rounded-lg)
- **Status Badges:** 8px (rounded-md) or full pill for specialized tags.

## Components
### Buttons
Primary buttons use Industrial Blue with white text. Minimum height is 44px. Secondary buttons use a Slate-100 ghost style. Loading states must show a spinner without changing the button's dimensions.

### Inputs & Fields
Inputs feature a 1px Slate-300 border that thickens and changes to Industrial Blue on focus. Labels are always persistent (top-aligned, never floating) to ensure context is never lost during data entry.

### Inventory Cards
Cards display a "Status Strip" on the left edge (Emerald or Rose) for immediate identification. They include a monospaced SKU label and a bold "Current Stock" count.

### Data Tables
Tables are the heart of the system. They use a "Zebra-stripe" pattern (Slate-50) on alternating rows for readability. Action columns (Edit/Delete) are pinned to the right on mobile screens.

### Chips & Badges
Small, high-contrast badges used for stock status. They use the semantic background (e.g., Emerald-100) with darkened text (Emerald-700) for maximum accessibility.