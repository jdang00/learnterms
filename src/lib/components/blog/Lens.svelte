<p>
	For the past 4 weeks, LearnTerms users have not been studying the entire list of words from the
	terms workbook.
</p>
<p>
	That sounds a little crazy. I know. But this is highly intentional. As I took more quizzes for
	4001, I picked up on certain patterns. Words about the eye tended to make it on there. Big long
	combining words were not ever tested on. Eventually, it made me realize that I could predict to a
	certain degree whether some terms would be tested or not. I did some whiteboard work and came up
	with an algorithm that would systemically cut out terms that were mathematically not likely to be
	tested. This ends up creating smaller decks and more efficient studying habits. Here&#x27;s how it
	works.
</p>
<h2>LENS: Learning Efficiency and Nomenclature Scoring</h2>
<p>LENS works by taking three things into account:</p>
<ul>
	<li>
		<strong>Importance:</strong> How relevant is it to the eye?
	</li>
	<li>
		<strong>Quizability</strong> How likely is it to show up on a quiz?
	</li>
	<li>
		<strong>Difficulty:</strong> How hard is it to learn?
	</li>
</ul>
<p>
	These factors, determined in part by manual sorting and with the help of AI and scripting,
	contribute to a LENS value for every term. A threshold score is produced to decide whether or not
	the card made it into the deck. If a term had a high LENS value, it would be in the deck. If it
	had a low value, it was discarded since it was determined to be an irrelevant card.
</p>
<p>
	Naturally, there is a certain amount of risk to this. The main concern is this: &quot;What if we
	get quizzed over a term that was discarded?&quot; As of the implementation of LENS in week 5,
	there has been a 100% correspondence between tested terms and terms in the deck. This is in part
	due to a conservative threshold. The algorithm does a very good job in marking relevant terms
	based on the patterns of tested terms on the quizzes. If there is a discarded term asked on a
	quiz, the LearnTerms decks are built specifically to help learn roots. There is a great chance you
	can put the word together on your own.
</p>
<p>
	If you want to find out how the LENS algorithm works, I&#x27;ve attached a paper that I wrote
	detailing the mathematical basis of how LENS values are determined. You can also see an analysis
	of effectivness in card reduction and quiz scores.
</p>
<a
	href="https://utfs.io/f/DYlXFqnaImOrDUuam6qnaImOrwFJXt2vDNoh9uC37QZKg0VR"
	rel="noopener noreferrer"
>
	The LENS Algorithm for Introduction to Optometry 4001
</a>
<p>
	Thank you again for your trust in the platform. I&#x27;m working every day to help you to study
	better and more efficiently.
</p>
<p>JD</p>
