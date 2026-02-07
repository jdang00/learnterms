const CRAWLER_UA =
	/discordbot|slackbot|twitterbot|facebookexternalhit|telegrambot|whatsapp|linkedinbot|applebot|googlebot|bingbot|bot|crawler|spider|crawling|pinterest|tumblr/i;

export function isCrawler(request: Request): boolean {
	const ua = request.headers.get('user-agent') || '';
	return CRAWLER_UA.test(ua);
}
