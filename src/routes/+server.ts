import { json } from '@sveltejs/kit';
import * as fs from 'fs';

function parseFlashcards(filePath: string): { term: string; meaning: string }[] {
	const content = fs.readFileSync(filePath, 'utf-8');
	const lines = content.split('\n');
	const flashcards = lines.map((line) => {
		const [term, meaning] = line.split('\t');
		return { term: term.trim(), meaning: meaning.trim() };
	});
	return flashcards;
}

function shuffleFlashcards(
	flashcards: { term: string; meaning: string }[]
): { term: string; meaning: string }[] {
	for (let i = flashcards.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[flashcards[i], flashcards[j]] = [flashcards[j], flashcards[i]];
	}
	return flashcards;
}

export async function GET() {
	const flashcards = parseFlashcards('src/flashcards.txt'); // Path to your text file
	const shuffledFlashcards = shuffleFlashcards(flashcards);
	return json(shuffledFlashcards);
}
