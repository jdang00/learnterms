<script lang="ts">
	type Gradient = {
		from: string;
		mid: string;
		to: string;
	};

	interface Props {
		idBase: string;
		size?: number;
		gradient: Gradient;
		iconColor: string;
		icon?: any;
		iconScale?: number;
		class?: string;
	}

	let {
		idBase,
		size = 200,
		gradient,
		iconColor,
		icon,
		iconScale = 0.24,
		class: className = ''
	}: Props = $props();

	const svgIdBase = $derived.by(() => idBase.toLowerCase().replace(/[^a-z0-9_-]/g, '-'));
	const iconSize = $derived.by(() => Math.max(14, Math.round(size * iconScale)));
	const IconComponent = $derived.by(() => icon);
</script>

<div class={`relative ${className}`} style={`width:${size}px; height:${size}px;`}>
	<svg
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 256 256"
		width={size}
		height={size}
		role="img"
		class="block"
	>
		<defs>
			<linearGradient id={`shield-${svgIdBase}`} x1="0" y1="0" x2="1" y2="1">
				<stop offset="0%" stop-color={gradient.from} />
				<stop offset="45%" stop-color={gradient.mid} />
				<stop offset="100%" stop-color={gradient.to} />
			</linearGradient>
			<linearGradient id={`panel-${svgIdBase}`} x1="0" y1="0" x2="0" y2="1">
				<stop offset="0%" stop-color="#0b1220" stop-opacity="0.92" />
				<stop offset="100%" stop-color="#0b1220" stop-opacity="0.75" />
			</linearGradient>
			<linearGradient id={`rim-${svgIdBase}`} x1="0" y1="0" x2="1" y2="1">
				<stop offset="0%" stop-color="#fbbf24" />
				<stop offset="45%" stop-color="#fde68a" />
				<stop offset="100%" stop-color="#f59e0b" />
			</linearGradient>
			<linearGradient id={`gloss-${svgIdBase}`} x1="0" y1="0" x2="0" y2="1">
				<stop offset="0%" stop-color="#ffffff" stop-opacity="0.35" />
				<stop offset="55%" stop-color="#ffffff" stop-opacity="0.08" />
				<stop offset="100%" stop-color="#ffffff" stop-opacity="0" />
			</linearGradient>
		</defs>

		<path
			d="M128 18 C 92 28, 62 42, 44 54 V 126 C 44 178, 78 216, 128 238 C 178 216, 212 178, 212 126 V 54 C 194 42, 164 28, 128 18 Z"
			fill={`url(#shield-${svgIdBase})`}
			stroke={`url(#rim-${svgIdBase})`}
			stroke-width="10"
			stroke-linejoin="round"
		/>

		<path
			d="M128 38 C 99 46, 74 58, 60 68 V 124 C 60 166, 88 196, 128 214 C 168 196, 196 166, 196 124 V 68 C 182 58, 157 46, 128 38 Z"
			fill={`url(#panel-${svgIdBase})`}
			stroke="#ffffff"
			stroke-opacity="0.10"
			stroke-width="2"
			stroke-linejoin="round"
		/>

		<path
			d="M128 34 C 102 42, 80 52, 66 62 C 88 74, 110 82, 128 82 C 146 82, 168 74, 190 62 C 176 52, 154 42, 128 34 Z"
			fill={`url(#gloss-${svgIdBase})`}
		/>

		<g transform="translate(0,2)">
			<circle cx="128" cy="122" r="56" fill="#ffffff" fill-opacity="0.06" />
			<circle
				cx="128"
				cy="122"
				r="40"
				fill={iconColor}
				fill-opacity="0.15"
				stroke={iconColor}
				stroke-opacity="0.3"
				stroke-width="2"
			/>
		</g>
	</svg>

	{#if IconComponent}
		<div class="absolute inset-0 flex items-center justify-center pointer-events-none">
			<IconComponent size={iconSize} color={iconColor} strokeWidth={2.5} />
		</div>
	{/if}
</div>
