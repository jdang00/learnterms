<script lang="ts">
	import LandingPage from '$lib/components/landing/LandingPage.svelte';
</script>

<svelte:head>
	<script type="application/ld+json">
		{
			"@context": "https://schema.org",
			"@graph": [
				{
					"@type": "Brand",
					"@id": "https://learnterms.com/#brand",
					"name": "LearnTerms",
					"url": "https://learnterms.com/",
					"logo": "https://learnterms.com/icon-512.png",
					"description": "LearnTerms is a study platform for health-professions cohorts with class-aligned questions, practice tests, and progress tools."
				},
				{
					"@type": "WebSite",
					"@id": "https://learnterms.com/#website",
					"name": "LearnTerms",
					"url": "https://learnterms.com/",
					"description": "LearnTerms helps health-professions cohorts study with class-aligned questions, practice tests, and progress tools.",
					"about": { "@id": "https://learnterms.com/#brand" }
				},
				{
					"@type": "SoftwareApplication",
					"@id": "https://learnterms.com/#application",
					"name": "LearnTerms",
					"url": "https://learnterms.com/",
					"image": "https://learnterms.com/icon-512.png",
					"description": "Study class-aligned question banks, build practice tests, review explanations, and track learning progress with LearnTerms.",
					"applicationCategory": "EducationalApplication",
					"about": { "@id": "https://learnterms.com/#brand" }
				}
			]
		}
	</script>
</svelte:head>

<LandingPage />
