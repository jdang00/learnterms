import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../convex/_generated/api';
import { PUBLIC_CONVEX_URL } from '$env/static/public';

const convex = new ConvexHttpClient(PUBLIC_CONVEX_URL!);

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { userId } = await request.json();

		if (!userId) {
			return json({ error: 'User ID required' }, { status: 400 });
		}

		const startTime = Date.now();

		const result = await convex.query(api.userProgress.testGetUserProgressForModuleNew, {
			userId,
			questionIds: []
		});

		const endTime = Date.now();

		return json({
			totalRecords: result.totalRecords,
			interactedCount: result.interactedQuestions.length,
			executionTime: result.executionTime
		});
	} catch (error) {
		console.error('Test new method error:', error);
		return json({ error: 'Test failed' }, { status: 500 });
	}
};
