<script lang="ts">
	import LegalPage from '$lib/components/legal/LegalPage.svelte';
	import { resolve } from '$app/paths';
</script>

<LegalPage
	title="Privacy Policy"
	summary="How information is handled when you use LearnTerms to study, create course content, or manage a cohort."
>
	<h2>1. Who operates LearnTerms</h2>
	<p>
		LearnTerms is operated by Justin Dang. This policy covers the LearnTerms website and study
		service. For privacy questions or requests, contact Justin through the <a
			href={resolve('/contact')}>contact page</a
		>. External websites and services have their own privacy policies.
	</p>

	<h2>2. Information we collect</h2>
	<ul>
		<li>
			<strong>Account and membership information:</strong> your name, email address, profile image, account
			identifier, sign-in information, role, and class or cohort memberships.
		</li>
		<li>
			<strong>Learning activity:</strong> question answers, attempts, scores, study progress, reading
			activity, flags, badges, and interactions with study tools.
		</li>
		<li>
			<strong>Content you provide:</strong> uploaded course documents and images, questions, explanations,
			prompts, generated results, and feedback or support messages.
		</li>
		<li>
			<strong>Subscription information:</strong> customer and subscription identifiers, plan, payment
			status, and related transaction records. Payment details are handled through our payment provider’s
			checkout.
		</li>
		<li>
			<strong>Technical and usage information:</strong> browser and device details, visited pages, timestamps,
			network information such as IP addresses, errors, performance measurements, and interaction events.
			Analytics may include session replay when enabled.
		</li>
	</ul>
	<p>
		Some tools save preferences, calculation history, or grade-planning data in your browser.
		Clearing browser storage can remove this local information. Tool usage events may still be
		collected separately from the values you enter.
	</p>

	<h2>3. How information is used</h2>
	<p>
		We use information to authenticate accounts, provide class access, save progress, deliver study
		features, process uploaded materials, manage subscriptions, answer support requests,
		troubleshoot problems, prevent abuse, and improve LearnTerms. Learning activity also supports
		progress reports for authorized cohort staff.
	</p>

	<h2>4. Cookies, browser storage, and analytics</h2>
	<p>
		LearnTerms and its providers use cookies and browser storage for sign-in, preferences, and
		analytics. PostHog collects product usage events; for signed-in users, those events can be
		associated with an account identifier, name, email address, and profile information. Vercel
		Analytics and Speed Insights help measure site usage and performance.
	</p>
	<p>
		You can manage cookies and site storage in your browser. Blocking or clearing them can affect
		sign-in, saved preferences, and locally stored work. Contact us with questions about analytics
		associated with your account.
	</p>

	<h2>5. Sharing and service providers</h2>
	<p>
		Information is processed by providers that support the service, including Clerk for
		authentication, Convex for application data and backend processing, Vercel for hosting and
		performance analytics, PostHog for product analytics, Polar for subscriptions and checkout, and
		Cloudflare R2 for file storage. Some existing files are served through UploadThing.
	</p>
	<p>
		Authorized administrators and curators can access information needed to manage their cohorts,
		including membership and study progress. Content shared with a class or cohort is available to
		the people who have access to that space. We may also disclose information when required by law,
		to respond to lawful requests, or to protect users and the service.
	</p>

	<h2>6. AI and document processing</h2>
	<p>
		When you use document processing or question generation, uploaded files, extracted text,
		prompts, and relevant course content may be sent to Datalab and AI services accessed through
		OpenRouter or other configured model providers. Generated content, source references, and
		processing records may be stored to support review, troubleshooting, and continued use. AI
		processing is subject to the applicable providers’ data practices.
	</p>
	<p>
		Only upload materials you are permitted to share and process. Do not submit patient identifiers,
		protected health information, passwords, or other sensitive information that is unnecessary for
		studying.
	</p>

	<h2>7. Retention and security</h2>
	<p>
		Information is retained to provide the service and for operational, security,
		dispute-resolution, and legal needs. Retention varies by the type of record and the systems that
		hold it. Backups, logs, and provider records may remain for a period after information is
		removed from the active application.
	</p>
	<p>
		LearnTerms uses HTTPS and access controls to help protect information. No online service or
		storage system can guarantee complete security. Keep your sign-in credentials secure and contact
		us if you suspect unauthorized access.
	</p>

	<h2>8. Your choices and requests</h2>
	<p>
		You can update available profile settings through your account. To request access, correction,
		deletion, or information about your personal data, use the <a href={resolve('/contact')}
			>contact page</a
		>. We may need to verify your identity before acting. Deleting an authentication account may not
		automatically remove all study records, uploaded content, analytics, or subscription records, so
		contact us for a broader deletion request.
	</p>
	<p>
		Depending on where you live, applicable law may provide additional privacy rights. Requests are
		handled in accordance with applicable law; some records may need to be retained for legal,
		security, or transaction purposes. Please do not include passwords or sensitive personal
		information in an initial support message.
	</p>

	<h2>9. Children and international processing</h2>
	<p>
		LearnTerms is intended for college and professional education and is not directed to children
		under 13. If you believe a child under 13 has provided personal information, contact us so we
		can investigate and address it. Our providers may process information in the United States or
		other countries where they operate.
	</p>

	<h2>10. Changes to this policy</h2>
	<p>
		We may update this policy as LearnTerms and its data practices change. The date above identifies
		the latest revision. When required by applicable law, we will provide additional notice of
		material changes.
	</p>
</LegalPage>
