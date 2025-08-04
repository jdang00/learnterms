# Theme Management System

This project implements a centralized theme management system that integrates seamlessly with Clerk authentication components and provides reactive theme switching across the entire application.

## Architecture Overview

### Core Components

1. **Theme Store** (`src/lib/theme.svelte.ts`)
   - Centralized theme state management
   - Persistent localStorage integration
   - Clerk theme integration
   - Reactive theme updates

2. **Theme Provider** (`src/lib/components/ThemeProvider.svelte`)
   - Provides theme context to child components
   - Enables dependency injection pattern

3. **Theme Toggle** (`src/lib/components/ThemeToggle.svelte`)
   - Reusable theme toggle component
   - Configurable size and variant
   - Smooth icon transitions

4. **Theme Hook** (`src/lib/hooks/useTheme.svelte.ts`)
   - Easy access to theme functionality
   - Fallback to direct imports if context unavailable

## Key Features

### 1. Clerk Integration
```svelte
<ClerkProvider 
  publishableKey={PUBLIC_CLERK_PUBLISHABLE_KEY}
  appearance={{ baseTheme: $clerkTheme }}
>
```

The `clerkTheme` derived store automatically returns Clerk's dark theme when in dark mode, or `undefined` for light mode (which uses Clerk's default light theme).

### 2. Persistent State
Theme preferences are automatically saved to localStorage and restored on page load:

```typescript
const init = () => {
  if (browser) {
    const savedTheme = localStorage.getItem('theme') as ThemeMode || 'light';
    set(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);
  }
};
```

### 3. Reactive Updates
All components automatically update when the theme changes through Svelte's reactive system:

```typescript
export const isDark = derived(theme, ($theme) => $theme === 'dark');
```

### 4. DaisyUI Integration
Uses DaisyUI's theme system with the `data-theme` attribute for consistent styling across all components.

## Usage Examples

### Basic Theme Toggle
```svelte
<script>
  import { theme } from '$lib/theme.svelte';
</script>

<button onclick={() => theme.toggle()}>
  Toggle Theme
</button>
```

### Using the Theme Toggle Component
```svelte
<script>
  import ThemeToggle from '$lib/components/ThemeToggle.svelte';
</script>

<ThemeToggle size="lg" variant="primary" />
```

### Accessing Theme State
```svelte
<script>
  import { isDark } from '$lib/theme.svelte';
</script>

<div class="text-{$isDark ? 'white' : 'black'}">
  Current theme: {$isDark ? 'dark' : 'light'}
</div>
```

### Using the Theme Hook
```svelte
<script>
  import { useTheme } from '$lib/hooks/useTheme.svelte';
  
  const theme = useTheme();
</script>

<button onclick={() => theme.set('dark')}>
  Set Dark Theme
</button>
```

## Implementation Details

### Theme Store Structure
```typescript
const createThemeStore = () => {
  const { subscribe, set, update } = writable<ThemeMode>('light');

  return {
    subscribe,
    toggle: () => update(current => current === 'light' ? 'dark' : 'light'),
    set: (theme: ThemeMode) => set(theme),
    init: () => { /* initialization logic */ }
  };
};
```

### Clerk Theme Integration
```typescript
export const clerkTheme = derived(theme, ($theme) => 
  $theme === 'dark' ? dark : undefined
);
```

### Layout Integration
The main layout initializes the theme system and provides Clerk with the appropriate theme:

```svelte
<script>
  import { theme, clerkTheme } from '$lib/theme.svelte';
  import { onMount } from 'svelte';

  onMount(() => {
    theme.init();
  });
</script>

<ClerkProvider 
  publishableKey={PUBLIC_CLERK_PUBLISHABLE_KEY}
  appearance={{ baseTheme: $clerkTheme }}
>
  <!-- App content -->
</ClerkProvider>
```

## Benefits

1. **Seamless Integration**: Clerk components automatically match your site's theme
2. **Reactive Updates**: Theme changes are immediately reflected across all components
3. **Persistent State**: Theme preferences are saved and restored across sessions
4. **Consistent Design**: All UI elements maintain visual consistency
5. **Minimal Code**: Simple integration with minimal boilerplate
6. **Type Safety**: Full TypeScript support with proper typing

## Demo

Visit `/theme-demo` to see the theme system in action with interactive controls and status displays.

## Migration from Previous System

The new system replaces the previous `theme-change` library usage with a more integrated approach:

- **Before**: Used `themeChange()` and manual localStorage management
- **After**: Centralized store with automatic persistence and Clerk integration

This provides better type safety, cleaner code, and seamless Clerk integration while maintaining all existing functionality. 