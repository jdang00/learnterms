export type LandingReview = {
	id: string;
	headline: string;
	quote: string;
	name: string;
	program: string;
	year: string;
	outcome: string;
};

export const landingReviews: LandingReview[] = [
	{
		id: 'review-01',
		headline: 'A supplemental tool that became my main study workflow',
		quote:
			'I started using LearnTerms as supplemental practice and it quickly became core to how I studied. It helped me stay organized, reinforce weak areas, and prepare with more confidence across demanding courses.',
		name: 'Kaity S.',
		program: 'Optometry Student',
		year: 'OS2',
		outcome: 'Used it as daily reinforcement and exam prep support.'
	},
	{
		id: 'review-02',
		headline: 'Repetition helped new material stick',
		quote:
			'Repeated question practice made it much easier to retain new content. The platform made consistent review simple and effective.',
		name: 'Collin L.',
		program: 'Optometry Student',
		year: 'OS2',
		outcome: 'Used repetition-based practice to reinforce weekly material.'
	},
	{
		id: 'review-03',
		headline: 'Test-like practice improved exam preparation',
		quote:
			'It is hard to create realistic self-quizzing conditions on your own. LearnTerms provided a test-like format that made studying more focused and efficient.',
		name: 'Eric R.',
		program: 'Optometry Student',
		year: 'OS2',
		outcome: 'Narrowed study scope and prepared with more exam-relevant practice.'
	},
	{
		id: 'review-07',
		headline: 'Centralized question workflow saved significant time',
		quote:
			'This platform has saved me hundreds of hours. I was responsible for building practice questions, and LearnTerms replaced scattered documents and flashcards with one live system that our group could update in real time.',
		name: 'Rad S.',
		program: 'Pharmacy Student',
		year: 'P2',
		outcome: 'Used live corrections and peer-performance tracking to keep practice content effective.'
	},
	{
		id: 'review-08',
		headline: 'High-volume notes became manageable exam prep',
		quote:
			'This platform helps me work through large volumes of notes quickly and turn them into practical review sessions. It prepares me for the real testing environment because the workflow feels very close to what I use on exam day.',
		name: 'Nate W.',
		program: 'Optometry Student',
		year: 'OS2',
		outcome: 'Used it to convert heavy note loads into exam-style preparation.'
	},
	{
		id: 'review-09',
		headline: 'AI question volume improved daily study efficiency',
		quote:
			'The high output of AI-generated questions helps me study more effectively. I use LearnTerms to supplement my existing routine and, in some courses, it has replaced most of my Quizlet workflow.',
		name: 'Emily A.',
		program: 'Pharmacy Student',
		year: 'P2',
		outcome: 'Shifted core review from flashcard-heavy sessions to question-based practice.'
	}
];
