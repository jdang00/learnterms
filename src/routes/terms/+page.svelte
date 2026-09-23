<script lang="ts">
	import LegalPage from '$lib/components/legal/LegalPage.svelte';
	import { resolve } from '$app/paths';
</script>

<LegalPage
	title="Terms and Conditions"
	summary="The responsibilities and conditions that apply when using LearnTerms."
>
	<h2>1. Using LearnTerms</h2>
	<p>
		These terms govern your use of LearnTerms, operated by Justin Dang. By using the service, you
		agree to these terms. If you do not agree, stop using the service. You must be legally able to
		accept these terms, or have a parent or guardian’s permission where applicable. LearnTerms is
		not intended for children under 13.
	</p>

	<h2>2. Accounts and access</h2>
	<p>
		Provide accurate account information, keep your credentials secure, and use only accounts and
		class access you are authorized to use. You are responsible for activity under your account.
		Contact us if you suspect unauthorized access. Cohort membership and curator permissions
		determine which materials and management tools you can access.
	</p>

	<h2>3. Educational use</h2>
	<p>
		LearnTerms provides study tools, practice questions, explanations, and progress information for
		educational use. Content can contain errors, including AI-generated content. Verify important
		information against your course materials and authoritative references. The service does not
		provide medical advice, clinical decision support, or a guarantee of grades, exam results, or
		professional competence.
	</p>
	<p>
		Follow your school’s academic integrity rules and any restrictions on sharing lecture materials,
		examinations, or other course content.
	</p>

	<h2>4. Your content and permissions</h2>
	<p>
		You retain any rights you hold in materials you submit. You are responsible for having
		permission to upload, share, and process those materials. By submitting content, you grant
		LearnTerms permission to host, store, reproduce, process, and display it as needed to operate
		the service, including generating study materials and making content available to the classes or
		cohorts with which you share it.
	</p>
	<p>
		Do not upload patient identifiers, protected health information, confidential examination
		material, or content that violates another person’s privacy or intellectual property rights.
		Report suspected infringement through the <a href={resolve('/contact')}>contact page</a>,
		identifying the material and the basis for your concern.
	</p>

	<h2>5. Acceptable use</h2>
	<p>
		You must not interfere with the service, attempt unauthorized access, bypass access controls or
		usage limits, distribute malicious software, harass others, or use LearnTerms for unlawful
		activity. Do not copy or redistribute restricted course content without permission. Automated
		access must respect access controls and must not disrupt the service.
	</p>

	<h2>6. Subscriptions and payments</h2>
	<p>
		Paid features, prices, billing intervals, taxes, and renewal conditions are described in the
		applicable pricing and checkout flow. Subscriptions are processed through Polar. Review the
		checkout terms before purchasing. Where a subscription renews automatically, recurring charges
		continue according to the checkout terms until canceled.
	</p>
	<p>
		Use the subscription management portal available from the pricing page to manage or cancel an
		eligible subscription. Cancellation, access through the end of a billing period, and refunds are
		subject to the terms shown at purchase and applicable law. Contact us if you need billing
		assistance. These terms do not limit any mandatory consumer rights.
	</p>

	<h2>7. LearnTerms materials and third-party services</h2>
	<p>
		LearnTerms branding, interface, and original service materials remain the property of their
		respective owners. Any software distributed under a separate open-source license is governed by
		that license. Access to the service does not grant ownership of the service or of other users’
		course content.
	</p>
	<p>
		The service uses third-party providers and may link to external websites. Your use of those
		services may be governed by their own terms. LearnTerms does not control external websites or
		guarantee their availability.
	</p>

	<h2>8. Availability and changes</h2>
	<p>
		Features may change, and the service may be interrupted for maintenance, updates, or issues
		outside our control. Keep your own copies of important source materials. We may restrict or
		suspend access when reasonably necessary to address a violation of these terms, security
		concerns, unlawful activity, or misuse. You may stop using LearnTerms at any time.
	</p>

	<h2>9. Disclaimers and responsibility</h2>
	<p>
		To the extent permitted by applicable law, LearnTerms is provided “as is” and “as available,”
		without warranties of accuracy, uninterrupted availability, fitness for a particular purpose, or
		error-free operation. You are responsible for how you use study content and generated results.
	</p>
	<p>
		To the extent permitted by law, LearnTerms and its operator are not liable for indirect,
		incidental, special, or consequential losses arising from use of the service. Nothing in these
		terms excludes liability or rights that cannot lawfully be excluded.
	</p>

	<h2>10. Privacy, updates, and contact</h2>
	<p>
		The <a href={resolve('/privacy')}>Privacy Policy</a> explains how information is handled. We may
		revise these terms as the service changes and will update the date above. Additional notice will
		be provided when required by law. For questions, billing help, content concerns, or account
		requests, contact Justin Dang through the <a href={resolve('/contact')}>contact page</a>.
	</p>
</LegalPage>
