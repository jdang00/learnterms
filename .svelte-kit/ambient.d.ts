
// this file is generated — do not edit it


/// <reference types="@sveltejs/kit" />

/**
 * Environment variables [loaded by Vite](https://vitejs.dev/guide/env-and-mode.html#env-files) from `.env` files and `process.env`. Like [`$env/dynamic/private`](https://svelte.dev/docs/kit/$env-dynamic-private), this module cannot be imported into client-side code. This module only includes variables that _do not_ begin with [`config.kit.env.publicPrefix`](https://svelte.dev/docs/kit/configuration#env) _and do_ start with [`config.kit.env.privatePrefix`](https://svelte.dev/docs/kit/configuration#env) (if configured).
 * 
 * _Unlike_ [`$env/dynamic/private`](https://svelte.dev/docs/kit/$env-dynamic-private), the values exported from this module are statically injected into your bundle at build time, enabling optimisations like dead code elimination.
 * 
 * ```ts
 * import { API_KEY } from '$env/static/private';
 * ```
 * 
 * Note that all environment variables referenced in your code should be declared (for example in an `.env` file), even if they don't have a value until the app is deployed:
 * 
 * ```
 * MY_FEATURE_FLAG=""
 * ```
 * 
 * You can override `.env` values from the command line like so:
 * 
 * ```bash
 * MY_FEATURE_FLAG="enabled" npm run dev
 * ```
 */
declare module '$env/static/private' {
	export const CLERK_SECRET_KEY: string;
	export const PRIVATE_USERCARD_TABLE: string;
	export const PRIVATE_USER_TABLE: string;
	export const PRIVATE_FLASHCARD_TABLE: string;
	export const tmux_conf_theme_status_attr: string;
	export const tmux_conf_theme_colour_10: string;
	export const tmux_conf_theme_colour_11: string;
	export const tmux_conf_theme_root_bg: string;
	export const tmux_conf_theme_right_separator_main: string;
	export const tmux_conf_theme_colour_12: string;
	export const tmux_conf_theme_window_status_activity_attr: string;
	export const tmux_conf_theme_message_command_attr: string;
	export const tmux_conf_theme_colour_13: string;
	export const tmux_conf_copy_to_os_clipboard: string;
	export const TERM_PROGRAM: string;
	export const NODE: string;
	export const tmux_conf_theme_synchronized_attr: string;
	export const tmux_conf_theme_colour_14: string;
	export const INIT_CWD: string;
	export const tmux_conf_theme_status_right_bg: string;
	export const tmux_conf_theme_mouse_attr: string;
	export const tmux_conf_theme_colour_15: string;
	export const tmux_conf_theme_window_status_last_bg: string;
	export const tmux_conf_theme_window_bg: string;
	export const tmux_conf_theme_root_attr: string;
	export const tmux_conf_theme_prefix_bg: string;
	export const tmux_conf_theme_focused_pane_bg: string;
	export const tmux_conf_theme_colour_16: string;
	export const TERM: string;
	export const SHELL: string;
	export const tmux_conf_theme_window_status_current_bg: string;
	export const tmux_conf_theme_window_status_bell_attr: string;
	export const tmux_conf_theme_colour_17: string;
	export const tmux_conf_theme_root: string;
	export const tmux_conf_new_pane_reconnect_ssh: string;
	export const tmux_conf_battery_bar_symbol_empty: string;
	export const TMPDIR: string;
	export const HOMEBREW_REPOSITORY: string;
	export const npm_config_global_prefix: string;
	export const tmux_conf_theme_right_separator_sub: string;
	export const tmux_conf_theme_pane_active_indicator: string;
	export const tmux_conf_theme_message_bg: string;
	export const tmux_conf_theme_window_status_last_fg: string;
	export const tmux_conf_theme_window_fg: string;
	export const tmux_conf_theme_synchronized: string;
	export const tmux_conf_theme_prefix_fg: string;
	export const tmux_conf_battery_status_discharging: string;
	export const TERM_PROGRAM_VERSION: string;
	export const tmux_conf_theme_window_status_current_fg: string;
	export const COLOR: string;
	export const tmux_conf_theme_window_status_bg: string;
	export const tmux_conf_theme_mode_attr: string;
	export const npm_config_noproxy: string;
	export const tmux_conf_new_window_reconnect_ssh: string;
	export const npm_config_local_prefix: string;
	export const ZSH: string;
	export const TMUX_CONF: string;
	export const tmux_conf_theme_pane_indicator: string;
	export const tmux_conf_theme_colour_1: string;
	export const tmux_conf_battery_vbar_palette: string;
	export const USER: string;
	export const LS_COLORS: string;
	export const tmux_conf_theme_window_status_last_attr: string;
	export const tmux_conf_theme_prefix_attr: string;
	export const tmux_conf_theme_colour_3: string;
	export const tmux_conf_theme_colour_2: string;
	export const COMMAND_MODE: string;
	export const npm_config_globalconfig: string;
	export const tmux_conf_theme_status_left_bg: string;
	export const tmux_conf_theme_status_left_attr: string;
	export const tmux_conf_theme_prefix: string;
	export const tmux_conf_theme_colour_5: string;
	export const tmux_conf_theme_left_separator_main: string;
	export const tmux_conf_theme_colour_4: string;
	export const tmux_conf_theme_colour_7: string;
	export const SSH_AUTH_SOCK: string;
	export const tmux_conf_theme_colour_6: string;
	export const __CF_USER_TEXT_ENCODING: string;
	export const TMUX_PROGRAM: string;
	export const npm_execpath: string;
	export const tmux_conf_theme_status_left_fg: string;
	export const tmux_conf_theme_colour_9: string;
	export const PAGER: string;
	export const tmux_conf_theme_mouse_fg: string;
	export const tmux_conf_theme_message_attr: string;
	export const tmux_conf_theme_colour_8: string;
	export const tmux_conf_theme_clock_colour: string;
	export const TMUX: string;
	export const LSCOLORS: string;
	export const tmux_conf_theme_highlight_focused_pane: string;
	export const tmux_conf_theme_pairing: string;
	export const tmux_conf_theme_message_fg: string;
	export const PATH: string;
	export const npm_package_json: string;
	export const npm_config_engine_strict: string;
	export const _: string;
	export const tmux_conf_theme_window_status_activity_bg: string;
	export const tmux_conf_theme_message_command_bg: string;
	export const TMUX_CONF_LOCAL: string;
	export const LaunchInstanceID: string;
	export const npm_config_userconfig: string;
	export const npm_config_init_module: string;
	export const __CFBundleIdentifier: string;
	export const npm_command: string;
	export const tmux_conf_theme_mode_fg: string;
	export const PWD: string;
	export const tmux_conf_preserve_stock_bindings: string;
	export const tmux_conf_new_session_prompt: string;
	export const tmux_conf_battery_bar_symbol_full: string;
	export const npm_lifecycle_event: string;
	export const EDITOR: string;
	export const tmux_conf_theme_window_status_activity_fg: string;
	export const tmux_conf_theme_terminal_title: string;
	export const tmux_conf_theme_message_command_fg: string;
	export const npm_package_name: string;
	export const tmux_conf_theme_synchronized_bg: string;
	export const tmux_conf_theme_clock_style: string;
	export const tmux_conf_theme_window_status_format: string;
	export const tmux_conf_theme_window_status_attr: string;
	export const tmux_conf_theme: string;
	export const npm_config_npm_version: string;
	export const tmux_conf_theme_window_status_bell_fg: string;
	export const XPC_FLAGS: string;
	export const TMUX_PANE: string;
	export const tmux_conf_theme_synchronized_fg: string;
	export const tmux_conf_uninstall_plugins_on_reload: string;
	export const npm_config_node_gyp: string;
	export const npm_package_version: string;
	export const tmux_conf_theme_window_status_current_attr: string;
	export const tmux_conf_theme_window_status_bell_bg: string;
	export const tmux_conf_battery_hbar_palette: string;
	export const XPC_SERVICE_NAME: string;
	export const tmux_conf_theme_left_separator_sub: string;
	export const tmux_conf_theme_mouse_bg: string;
	export const tmux_conf_new_session_retain_current_path: string;
	export const SHLVL: string;
	export const HOME: string;
	export const tmux_conf_theme_pairing_bg: string;
	export const tmux_conf_battery_bar_length: string;
	export const tmux_conf_battery_status_charging: string;
	export const HOMEBREW_PREFIX: string;
	export const tmux_conf_theme_status_right_fg: string;
	export const tmux_conf_theme_status_right: string;
	export const tmux_conf_new_pane_retain_current_path: string;
	export const tmux_conf_24b_colour: string;
	export const tmux_conf_update_plugins_on_launch: string;
	export const tmux_conf_theme_pairing_fg: string;
	export const npm_config_cache: string;
	export const LESS: string;
	export const tmux_conf_new_window_retain_current_path: string;
	export const tmux_conf_battery_bar_palette: string;
	export const LOGNAME: string;
	export const npm_lifecycle_script: string;
	export const tmux_conf_update_plugins_on_reload: string;
	export const tmux_conf_theme_status_fg: string;
	export const tmux_conf_theme_pane_active_border: string;
	export const tmux_conf_theme_mode_bg: string;
	export const TMUX_SOCKET: string;
	export const npm_config_user_agent: string;
	export const tmux_conf_theme_status_bg: string;
	export const tmux_conf_theme_window_status_fg: string;
	export const tmux_conf_theme_pane_border_style: string;
	export const tmux_conf_theme_mouse: string;
	export const INFOPATH: string;
	export const HOMEBREW_CELLAR: string;
	export const tmux_conf_theme_status_left: string;
	export const tmux_conf_theme_pairing_attr: string;
	export const tmux_conf_theme_window_status_current_format: string;
	export const tmux_conf_theme_status_right_attr: string;
	export const SECURITYSESSIONID: string;
	export const tmux_conf_theme_root_fg: string;
	export const npm_node_execpath: string;
	export const npm_config_prefix: string;
	export const tmux_conf_theme_pane_border: string;
	export const NODE_ENV: string;
}

/**
 * Similar to [`$env/static/private`](https://svelte.dev/docs/kit/$env-static-private), except that it only includes environment variables that begin with [`config.kit.env.publicPrefix`](https://svelte.dev/docs/kit/configuration#env) (which defaults to `PUBLIC_`), and can therefore safely be exposed to client-side code.
 * 
 * Values are replaced statically at build time.
 * 
 * ```ts
 * import { PUBLIC_BASE_URL } from '$env/static/public';
 * ```
 */
declare module '$env/static/public' {
	export const PUBLIC_CLERK_PUBLISHABLE_KEY: string;
	export const PUBLIC_SUPABASE_URL: string;
	export const PUBLIC_SUPABASE_ANON_KEY: string;
	export const PUBLIC_USERCARD_TABLE: string;
	export const PUBLIC_USER_TABLE: string;
	export const PUBLIC_FLASHCARD_TABLE: string;
	export const PUBLIC_LESSON: string;
}

/**
 * This module provides access to runtime environment variables, as defined by the platform you're running on. For example if you're using [`adapter-node`](https://github.com/sveltejs/kit/tree/main/packages/adapter-node) (or running [`vite preview`](https://svelte.dev/docs/kit/cli)), this is equivalent to `process.env`. This module only includes variables that _do not_ begin with [`config.kit.env.publicPrefix`](https://svelte.dev/docs/kit/configuration#env) _and do_ start with [`config.kit.env.privatePrefix`](https://svelte.dev/docs/kit/configuration#env) (if configured).
 * 
 * This module cannot be imported into client-side code.
 * 
 * Dynamic environment variables cannot be used during prerendering.
 * 
 * ```ts
 * import { env } from '$env/dynamic/private';
 * console.log(env.DEPLOYMENT_SPECIFIC_VARIABLE);
 * ```
 * 
 * > In `dev`, `$env/dynamic` always includes environment variables from `.env`. In `prod`, this behavior will depend on your adapter.
 */
declare module '$env/dynamic/private' {
	export const env: {
		CLERK_SECRET_KEY: string;
		PRIVATE_USERCARD_TABLE: string;
		PRIVATE_USER_TABLE: string;
		PRIVATE_FLASHCARD_TABLE: string;
		tmux_conf_theme_status_attr: string;
		tmux_conf_theme_colour_10: string;
		tmux_conf_theme_colour_11: string;
		tmux_conf_theme_root_bg: string;
		tmux_conf_theme_right_separator_main: string;
		tmux_conf_theme_colour_12: string;
		tmux_conf_theme_window_status_activity_attr: string;
		tmux_conf_theme_message_command_attr: string;
		tmux_conf_theme_colour_13: string;
		tmux_conf_copy_to_os_clipboard: string;
		TERM_PROGRAM: string;
		NODE: string;
		tmux_conf_theme_synchronized_attr: string;
		tmux_conf_theme_colour_14: string;
		INIT_CWD: string;
		tmux_conf_theme_status_right_bg: string;
		tmux_conf_theme_mouse_attr: string;
		tmux_conf_theme_colour_15: string;
		tmux_conf_theme_window_status_last_bg: string;
		tmux_conf_theme_window_bg: string;
		tmux_conf_theme_root_attr: string;
		tmux_conf_theme_prefix_bg: string;
		tmux_conf_theme_focused_pane_bg: string;
		tmux_conf_theme_colour_16: string;
		TERM: string;
		SHELL: string;
		tmux_conf_theme_window_status_current_bg: string;
		tmux_conf_theme_window_status_bell_attr: string;
		tmux_conf_theme_colour_17: string;
		tmux_conf_theme_root: string;
		tmux_conf_new_pane_reconnect_ssh: string;
		tmux_conf_battery_bar_symbol_empty: string;
		TMPDIR: string;
		HOMEBREW_REPOSITORY: string;
		npm_config_global_prefix: string;
		tmux_conf_theme_right_separator_sub: string;
		tmux_conf_theme_pane_active_indicator: string;
		tmux_conf_theme_message_bg: string;
		tmux_conf_theme_window_status_last_fg: string;
		tmux_conf_theme_window_fg: string;
		tmux_conf_theme_synchronized: string;
		tmux_conf_theme_prefix_fg: string;
		tmux_conf_battery_status_discharging: string;
		TERM_PROGRAM_VERSION: string;
		tmux_conf_theme_window_status_current_fg: string;
		COLOR: string;
		tmux_conf_theme_window_status_bg: string;
		tmux_conf_theme_mode_attr: string;
		npm_config_noproxy: string;
		tmux_conf_new_window_reconnect_ssh: string;
		npm_config_local_prefix: string;
		ZSH: string;
		TMUX_CONF: string;
		tmux_conf_theme_pane_indicator: string;
		tmux_conf_theme_colour_1: string;
		tmux_conf_battery_vbar_palette: string;
		USER: string;
		LS_COLORS: string;
		tmux_conf_theme_window_status_last_attr: string;
		tmux_conf_theme_prefix_attr: string;
		tmux_conf_theme_colour_3: string;
		tmux_conf_theme_colour_2: string;
		COMMAND_MODE: string;
		npm_config_globalconfig: string;
		tmux_conf_theme_status_left_bg: string;
		tmux_conf_theme_status_left_attr: string;
		tmux_conf_theme_prefix: string;
		tmux_conf_theme_colour_5: string;
		tmux_conf_theme_left_separator_main: string;
		tmux_conf_theme_colour_4: string;
		tmux_conf_theme_colour_7: string;
		SSH_AUTH_SOCK: string;
		tmux_conf_theme_colour_6: string;
		__CF_USER_TEXT_ENCODING: string;
		TMUX_PROGRAM: string;
		npm_execpath: string;
		tmux_conf_theme_status_left_fg: string;
		tmux_conf_theme_colour_9: string;
		PAGER: string;
		tmux_conf_theme_mouse_fg: string;
		tmux_conf_theme_message_attr: string;
		tmux_conf_theme_colour_8: string;
		tmux_conf_theme_clock_colour: string;
		TMUX: string;
		LSCOLORS: string;
		tmux_conf_theme_highlight_focused_pane: string;
		tmux_conf_theme_pairing: string;
		tmux_conf_theme_message_fg: string;
		PATH: string;
		npm_package_json: string;
		npm_config_engine_strict: string;
		_: string;
		tmux_conf_theme_window_status_activity_bg: string;
		tmux_conf_theme_message_command_bg: string;
		TMUX_CONF_LOCAL: string;
		LaunchInstanceID: string;
		npm_config_userconfig: string;
		npm_config_init_module: string;
		__CFBundleIdentifier: string;
		npm_command: string;
		tmux_conf_theme_mode_fg: string;
		PWD: string;
		tmux_conf_preserve_stock_bindings: string;
		tmux_conf_new_session_prompt: string;
		tmux_conf_battery_bar_symbol_full: string;
		npm_lifecycle_event: string;
		EDITOR: string;
		tmux_conf_theme_window_status_activity_fg: string;
		tmux_conf_theme_terminal_title: string;
		tmux_conf_theme_message_command_fg: string;
		npm_package_name: string;
		tmux_conf_theme_synchronized_bg: string;
		tmux_conf_theme_clock_style: string;
		tmux_conf_theme_window_status_format: string;
		tmux_conf_theme_window_status_attr: string;
		tmux_conf_theme: string;
		npm_config_npm_version: string;
		tmux_conf_theme_window_status_bell_fg: string;
		XPC_FLAGS: string;
		TMUX_PANE: string;
		tmux_conf_theme_synchronized_fg: string;
		tmux_conf_uninstall_plugins_on_reload: string;
		npm_config_node_gyp: string;
		npm_package_version: string;
		tmux_conf_theme_window_status_current_attr: string;
		tmux_conf_theme_window_status_bell_bg: string;
		tmux_conf_battery_hbar_palette: string;
		XPC_SERVICE_NAME: string;
		tmux_conf_theme_left_separator_sub: string;
		tmux_conf_theme_mouse_bg: string;
		tmux_conf_new_session_retain_current_path: string;
		SHLVL: string;
		HOME: string;
		tmux_conf_theme_pairing_bg: string;
		tmux_conf_battery_bar_length: string;
		tmux_conf_battery_status_charging: string;
		HOMEBREW_PREFIX: string;
		tmux_conf_theme_status_right_fg: string;
		tmux_conf_theme_status_right: string;
		tmux_conf_new_pane_retain_current_path: string;
		tmux_conf_24b_colour: string;
		tmux_conf_update_plugins_on_launch: string;
		tmux_conf_theme_pairing_fg: string;
		npm_config_cache: string;
		LESS: string;
		tmux_conf_new_window_retain_current_path: string;
		tmux_conf_battery_bar_palette: string;
		LOGNAME: string;
		npm_lifecycle_script: string;
		tmux_conf_update_plugins_on_reload: string;
		tmux_conf_theme_status_fg: string;
		tmux_conf_theme_pane_active_border: string;
		tmux_conf_theme_mode_bg: string;
		TMUX_SOCKET: string;
		npm_config_user_agent: string;
		tmux_conf_theme_status_bg: string;
		tmux_conf_theme_window_status_fg: string;
		tmux_conf_theme_pane_border_style: string;
		tmux_conf_theme_mouse: string;
		INFOPATH: string;
		HOMEBREW_CELLAR: string;
		tmux_conf_theme_status_left: string;
		tmux_conf_theme_pairing_attr: string;
		tmux_conf_theme_window_status_current_format: string;
		tmux_conf_theme_status_right_attr: string;
		SECURITYSESSIONID: string;
		tmux_conf_theme_root_fg: string;
		npm_node_execpath: string;
		npm_config_prefix: string;
		tmux_conf_theme_pane_border: string;
		NODE_ENV: string;
		[key: `PUBLIC_${string}`]: undefined;
		[key: `${string}`]: string | undefined;
	}
}

/**
 * Similar to [`$env/dynamic/private`](https://svelte.dev/docs/kit/$env-dynamic-private), but only includes variables that begin with [`config.kit.env.publicPrefix`](https://svelte.dev/docs/kit/configuration#env) (which defaults to `PUBLIC_`), and can therefore safely be exposed to client-side code.
 * 
 * Note that public dynamic environment variables must all be sent from the server to the client, causing larger network requests — when possible, use `$env/static/public` instead.
 * 
 * Dynamic environment variables cannot be used during prerendering.
 * 
 * ```ts
 * import { env } from '$env/dynamic/public';
 * console.log(env.PUBLIC_DEPLOYMENT_SPECIFIC_VARIABLE);
 * ```
 */
declare module '$env/dynamic/public' {
	export const env: {
		PUBLIC_CLERK_PUBLISHABLE_KEY: string;
		PUBLIC_SUPABASE_URL: string;
		PUBLIC_SUPABASE_ANON_KEY: string;
		PUBLIC_USERCARD_TABLE: string;
		PUBLIC_USER_TABLE: string;
		PUBLIC_FLASHCARD_TABLE: string;
		PUBLIC_LESSON: string;
		[key: `PUBLIC_${string}`]: string | undefined;
	}
}
