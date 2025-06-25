export interface ScheduleItem {
	day: string;
	time: string;
	event: string;
	notes?: string;
	required: boolean;
	category: string;
	location?: string;
	room?: string; // Added optional room property
}

export interface FilterState {
	requirementFilter: 'all' | 'required' | 'optional';
	selectedDays: Set<string>;
	selectedCategories: Set<string>;
}

export class OMScheduleLogic {
	schedule: ScheduleItem[] = $state([
		{
			day: 'Throughout the Meeting',
			time: 'Varies',
			event: '🎓 Earn at least 5 CE credits',
			notes:
				'A total of 230+ courses and 310+ hours of CE are available throughout the meeting. Times and specific room locations for CE sessions will vary within the Minneapolis Convention Center, primarily on Level 2.',
			required: true,
			category: 'education',
			location:
				'https://maps.apple.com/place?address=1301%20S%20Second%20Ave,%20Minneapolis,%20MN%20%2555403,%20United%20States&coordinate=44.969656,-93.273711&name=Minneapolis%20Convention%20Center&place-id=IAB62E16EF76187A8&map=explore'
		},
		{
			day: 'Tuesday, June 24',
			time: '6:00 pm - 7:30 pm',
			event: '🤝 Innovation Hub Reception',
			notes:
				'This welcome reception kicks off the Innovation Hub program. It includes an Opening Panel: The Eye, and sets the stage for networking and exploring new industry developments.',
			required: false,
			category: 'networking',
			location:
				'https://maps.apple.com/place?address=1001%20Marquette%20Avenue%20South%0AMinneapolis,%20MN%2055403%0AUnited%20States&coordinate=44.972518,-93.272767&name=Hilton%20Minneapolis&place-id=I5E1CE9E014CF04FE&map=explore'
		},
		{
			day: 'Wednesday, June 25',
			time: '8:00 am - 9:00 am',
			event: '🥐 Symposium Breakfast',
			notes: 'One of the scheduled breakfasts for attendees.',
			required: false,
			category: 'meal',
			location:
				'https://maps.apple.com/place?address=1301%20S%20Second%20Ave,%20Minneapolis,%20MN%20%2555403,%20United%20States&coordinate=44.969656,-93.273711&name=Minneapolis%20Convention%20Center&place-id=IAB62E16EF76187A8&map=explore'
		},
		{
			day: 'Wednesday, June 25',
			time: '8:30 am - 12:15 pm',
			event: '💡 Innovation Hub',
			notes:
				'The main Innovation Hub program continues, featuring programming and dedicated networking breaks. This session follows the Networking Breakfast & Tabletops (7:30-8:30 AM) and is followed by the Lunch Keynote & Discussion (12:30-1:30 PM), and additional Networking & Tabletops (1:30-2:00 PM). The Innovation Hub program specifically focuses on 9 Start-Ups.',
			required: false,
			category: 'session',
			location:
				'https://maps.apple.com/place?address=1001%20Marquette%20Avenue%20South%0AMinneapolis,%20MN%2055403%0AUnited%20States&coordinate=44.972518,-93.272767&name=Hilton%20Minneapolis&place-id=I5E1CE9E014CF04FE&map=explore'
		},
		{
			day: 'Wednesday, June 25',
			time: '8:30 am - 12:30 pm',
			event: '🏛️ Presidents Council',
			notes: 'A dedicated meeting for the Presidents Council.',
			required: false,
			category: 'meeting',
			location:
				'https://maps.apple.com/place?address=1301%20S%20Second%20Ave,%20Minneapolis,%20MN%20%2555403,%20United%20States&coordinate=44.969656,-93.273711&name=Minneapolis%20Convention%20Center&place-id=IAB62E16EF76187A8&map=explore'
		},
		{
			day: 'Wednesday, June 25',
			time: '9:00 am - 5:00 pm',
			event: '📚 CE Sessions',
			notes:
				'Full day of Continuing Education sessions. Check the mobile app for specific course offerings, times, and room locations within the Minneapolis Convention Center (likely Level 2).',
			required: false,
			category: 'education',
			location:
				'https://maps.apple.com/place?address=1301%20S%20Second%20Ave,%20Minneapolis,%20MN%20%2555403,%20United%20States&coordinate=44.969656,-93.273711&name=Minneapolis%20Convention%20Center&place-id=IAB62E16EF76187A8&map=explore'
		},
		{
			day: 'Wednesday, June 25',
			time: '12:00 pm - 1:00 pm',
			event: '🥪 Symposium Lunch',
			notes: 'A general lunch provided during the symposium schedule.',
			required: false,
			category: 'meal',
			location:
				'https://maps.apple.com/place?address=1301%20S%20Second%20Ave,%20Minneapolis,%20MN%20%2555403,%20United%20States&coordinate=44.969656,-93.273711&name=Minneapolis%20Convention%20Center&place-id=IAB62E16EF76187A8&map=explore'
		},
		{
			day: 'Wednesday, June 25',
			time: '4:00 pm - 5:00 pm',
			event: '⭐ VIP Leadership Exchange Reception - New!',
			notes: 'A newly introduced reception designed for VIP attendees and leadership.',
			required: false,
			category: 'networking',
			location:
				'https://maps.apple.com/place?address=1301%20S%20Second%20Ave,%20Minneapolis,%20MN%20%2555403,%20United%20States&coordinate=44.969656,-93.273711&name=Minneapolis%20Convention%20Center&place-id=IAB62E16EF76187A8&map=explore'
		},
		{
			day: 'Wednesday, June 25',
			time: '4:30 pm - 5:15 pm',
			event: '👋 New Member Reception',
			notes:
				'An exclusive reception for new members to network and get acquainted with the AOA community.',
			required: false,
			category: 'networking',
			location:
				'https://maps.apple.com/place?address=1301%20S%20Second%20Ave,%20Minneapolis,%20MN%20%2555403,%20United%20States&coordinate=44.969656,-93.273711&name=Minneapolis%20Convention%20Center&place-id=IAB62E16EF76187A8&map=explore'
		},
		{
			day: 'Wednesday, June 25',
			time: '5:30 pm - 7:00 pm',
			event: '🚀 AOA Experience - Opening Session',
			notes:
				'This high-energy kickoff, with the theme "Ignite Your Vision – Experience Optometry," features remarks from AOA and WCO leadership, focusing on the future of optometry. It includes recognition of national awardees and AOSA student leaders, and a keynote by Dr. Richard Edlow. The session incorporates interactive seat messages and donation QR codes, seamlessly transitioning into the Opening Reception at Eye Care Square.',
			required: true,
			category: 'session',
			location:
				'https://maps.apple.com/place?address=1301%20S%20Second%20Ave,%20Minneapolis,%20MN%20%2555403,%20United%20States&coordinate=44.969656,-93.273711&name=Minneapolis%20Convention%20Center&place-id=IAB62E16EF76187A8&map=explore',
			room: 'Ballroom AB' // Added room
		},
		{
			day: 'Wednesday, June 25',
			time: '7:00 pm - 9:00 pm',
			event: '🎉 Eye Care Square: Exhibit Hall Opening Reception',
			notes:
				'Held immediately following the Opening General Session, this reception provides the first opportunity to explore the Exhibit Hall. It aims to leverage a fully engaged, on-site audience to drive early hall traffic and meaningful networking from day one, setting a dynamic and engaging tone for the full exhibit experience. The Exhibit Hall is located in Halls B, C, D, and E of the Minneapolis Convention Center. Light food and beverages included. Visit the AOSA Student Lounge to receive a voucher for Friday lunch (for all students) and hang out in the AOSA Lounge!',
			required: false,
			category: 'exhibit',
			location:
				'https://maps.apple.com/place?address=1301%20S%20Second%20Ave,%20Minneapolis,%20MN%20%2555403,%20United%20States&coordinate=44.969656,-93.273711&name=Minneapolis%20Convention%20Center&place-id=IAB62E16EF76187A8&map=explore',
			room: 'Exhibit Hall' // Added room
		},
		{
			day: 'Wednesday, June 25',
			time: '7:30 pm - 8:30 pm',
			event: '🎤 EYETalks Stage',
			notes:
				'Catch engaging presentations at the EYETalks Stage, conveniently located within the Eye Care Square Exhibit Hall.',
			required: false,
			category: 'session',
			location:
				'https://maps.apple.com/place?address=1301%20S%20Second%20Ave,%20Minneapolis,%20MN%20%2555403,%20United%20States&coordinate=44.969656,-93.273711&name=Minneapolis%20Convention%20Center&place-id=IAB62E16EF76187A8&map=explore',
			room: 'Exhibit Hall'
		},
		{
			day: 'Thursday, June 26',
			time: '7:00 am - 8:00 pm',
			event: '📚 CE Sessions',
			notes:
				'A full day of Continuing Education sessions. Attendees should consult the mobile app for detailed schedules and specific room assignments within the Minneapolis Convention Center.',
			required: false,
			category: 'education',
			location:
				'https://maps.apple.com/place?address=1301%20S%20Second%20Ave,%20Minneapolis,%20MN%20%2555403,%20United%20States&coordinate=44.969656,-93.273711&name=Minneapolis%20Convention%20Center&place-id=IAB62E16EF76187A8&map=explore'
		},
		{
			day: 'Thursday, June 26',
			time: '8:00 am - 9:00 am',
			event: '🥐 Symposium Breakfasts',
			notes: 'Breakfast options available for symposium attendees.',
			required: false,
			category: 'meal',
			location:
				'https://maps.apple.com/place?address=1301%20S%20Second%20Ave,%20Minneapolis,%20MN%20%2555403,%20United%20States&coordinate=44.969656,-93.273711&name=Minneapolis%20Convention%20Center&place-id=IAB62E16EF76187A8&map=explore'
		},
		{
			day: 'Thursday, June 26',
			time: '8:30 am - 11:30 am',
			event: '🏛️ House of Delegates',
			notes: 'The official meeting for the House of Delegates.',
			required: false,
			category: 'meeting',
			location:
				'https://maps.apple.com/place?address=1301%20S%20Second%20Ave,%20Minneapolis,%20MN%20%2555403,%20United%20States&coordinate=44.969656,-93.273711&name=Minneapolis%20Convention%20Center&place-id=IAB62E16EF76187A8&map=explore',
			room: 'Ballroom AB'
		},
		{
			day: 'Thursday, June 26',
			time: '9:00 am - 4:30 pm',
			event: '👀 Eye Care Square: Exhibit Hall',
			notes:
				'The Exhibit Hall is open all day for attendees to explore. This is an excellent opportunity to visit and engage with companies that support students and AOSA. Discover new innovations at the Innovation Wellness booth, try out the Pickleball court, see the "Eye Deserve More" booth with 7 layers of the eye, and explore the new Aesthetics Avenue hub. Located in Halls B, C, D, and E of the Minneapolis Convention Center.',
			required: false,
			category: 'exhibit',
			location:
				'https://maps.apple.com/place?address=1301%20S%20Second%20Ave,%20Minneapolis,%20MN%20%2555403,%20United%20States&coordinate=44.969656,-93.273711&name=Minneapolis%20Convention%20Center&place-id=IAB62E16EF76187A8&map=explore',
			room: 'Exhibit Hall'
		},
		{
			day: 'Thursday, June 26',
			time: '10:30 am - 12:00 pm', // Updated time
			event: '👓 EssilorLuxottica EyeFWD: Student Session',
			notes:
				'A dedicated session for students, presented by EssilorLuxottica EyeFWD. Attendees must attend to receive an Optometry Student Bowl (OSB) wristband. This session focuses on career development and industry insights.', // Updated notes
			required: true,
			category: 'session',
			location:
				'https://maps.apple.com/place?address=1301%20S%20Second%20Ave,%20Minneapolis,%20MN%20%2555403,%20United%20States&coordinate=44.969656,-93.273711&name=Minneapolis%20Convention%20Center&place-id=IAB62E16EF76187A8&map=explore',
			room: 'Auditorium' // Added room
		},
		{
			day: 'Thursday, June 26',
			time: '11:30 am - 2:30 pm',
			event: '🎤 EYETalks Stage',
			notes:
				'More compelling presentations are scheduled at the EYETalks Stage, situated within the Exhibit Hall.',
			required: false,
			category: 'session',
			location:
				'https://maps.apple.com/place?address=1301%20S%20Second%20Ave,%20Minneapolis,%20MN%20%2555403,%20United%20States&coordinate=44.969656,-93.273711&name=Minneapolis%20Convention%20Center&place-id=IAB62E16EF76187A8&map=explore',
			room: 'Exhibit Hall'
		},
		{
			day: 'Thursday, June 26',
			time: '12:00 pm - 1:00 pm',
			event: '🥪 Symposium Lunches',
			notes: 'Multiple lunch options are available for symposium attendees.',
			required: false,
			category: 'meal',
			location:
				'https://maps.apple.com/place?address=1301%20S%20Second%20Ave,%20Minneapolis,%20MN%20%2555403,%20United%20States&coordinate=44.969656,-93.273711&name=Minneapolis%20Convention%20Center&place-id=IAB62E16EF76187A8&map=explore'
		},
		{
			day: 'Thursday, June 26',
			time: '12:00 pm - 1:00 pm',
			event: '🔗 AOA+ Leadership Link Lunch',
			notes:
				'A specialized lunch designed for networking and connection within the AOA+ leadership community.',
			required: false,
			category: 'meal',
			location:
				'https://maps.apple.com/place?address=1301%20S%20Second%20Ave,%20Minneapolis,%20MN%20%2555403,%20United%20States&coordinate=44.969656,-93.273711&name=Minneapolis%20Convention%20Center&place-id=IAB62E16EF76187A8&map=explore'
		},
		{
			day: 'Thursday, June 26',
			time: '12:00 pm - 1:00 pm',
			event: '👓 Paraoptometric Appreciation Luncheon',
			notes: 'A luncheon dedicated to appreciating paraoptometric professionals.',
			required: false,
			category: 'meal',
			location:
				'https://maps.apple.com/place?address=1301%20S%20Second%20Ave,%20Minneapolis,%20MN%20%2555403,%20United%20States&coordinate=44.969656,-93.273711&name=Minneapolis%20Convention%20Center&place-id=IAB62E16EF76187A8&map=explore'
		},
		{
			day: 'Thursday, June 26',
			time: '1:00 pm - 2:30 pm', // Updated time
			event: '🤝 Affiliate Connections',
			notes:
				'A dedicated time and space for AOA affiliates to connect and network. This event is located within the Eye Care Square Exhibit Hall. Open to students and affiliates.', // Updated notes
			required: true,
			category: 'networking',
			location:
				'https://maps.apple.com/place?address=1301%20S%20Second%20Ave,%20Minneapolis,%20MN%20%2555403,%20United%20States&coordinate=44.969656,-93.273711&name=Minneapolis%20Convention%20Center&place-id=IAB62E16EF76187A8&map=explore',
			room: 'Exhibit Hall'
		},
		{
			day: 'Thursday, June 26',
			time: '1:00 pm - 3:00 pm',
			event: '💡 Paraoptometric Idea Exchange',
			notes: 'A collaborative session for paraoptometrics to share ideas and best practices.',
			required: false,
			category: 'session',
			location:
				'https://maps.apple.com/place?address=1301%20S%20Second%20Ave,%20Minneapolis,%20MN%20%2555403,%20United%20States&coordinate=44.969656,-93.273711&name=Minneapolis%20Convention%20Center&place-id=IAB62E16EF76187A8&map=explore'
		},
		{
			day: 'Thursday, June 26',
			time: '5:00 pm - 7:00 pm',
			event: '🍻 Alumni Receptions | Hilton',
			notes:
				'Various university alumni groups will host receptions at the Hilton Minneapolis, providing a chance to reconnect with former classmates and faculty.',
			required: false,
			category: 'networking',
			location:
				'https://maps.apple.com/place?address=1001%20Marquette%20Avenue%20South%0AMinneapolis,%20MN%2055403%0AUnited%20States&coordinate=44.972518,-93.272767&name=Hilton%20Minneapolis&place-id=I5E1CE9E014CF04FE&map=explore'
		},
		{
			day: 'Thursday, June 26',
			time: '7:00 pm - 11:45 pm',
			event:
				'🏆 AOSA Optometry Student Bowl™ XXXIV powered by EssilorLuxottica and EssilorLuxottica Live! Student Reception',
			notes:
				'This highly anticipated competition features optometry students battling it out in a fast-paced quiz format. It is powered by EssilorLuxottica and includes a larger student reception, "EssilorLuxottica Live!". The event provides both entertainment and significant networking opportunities for students. Held at The Fillmore. Doors open at 7:00 pm. Please note transportation details: 1.7 miles, 6-minute drive, 31-minute walk.', // Updated notes
			required: true,
			category: 'competition',
			location:
				'https://maps.apple.com/place?address=525%20N%20Fifth%20St,%20Minneapolis,%20MN%20%2555401,%20United%20States&coordinate=44.983967,-93.278792&name=The%20Fillmore%20Minneapolis&place-id=I6A1AAEE67A4472A&map=explore'
		},
		{
			day: 'Thursday, June 26',
			time: '9:00 pm - 11:00 pm',
			event: '🎸 Eye Docs of Rock | Varsity Theater',
			notes:
				'A fun, late-night event featuring optometric professionals showcasing their musical talents at the Varsity Theater. A great opportunity to unwind and socialize.',
			required: false,
			category: 'entertainment',
			location:
				'https://maps.apple.com/place?address=1308%20SE%204th%20St,%20Minneapolis,%20MN%2055414,%20United%20States&coordinate=44.983265,-93.243133&name=Varsity%20Theater&place-id=I5E4E8071F8E8936A&map=explore'
		},
		{
			day: 'Friday, June 27',
			time: '6:30 am - 6:15 am',
			event: '📸 ALL STAFF PICTURE',
			notes:
				'A scheduled photo opportunity for all staff members. (Note: The end time of 6:15 am suggests a very quick session or a possible typo in the source material, but it is listed as such.)',
			required: false,
			category: 'logistics',
			location:
				'https://maps.apple.com/place?address=1301%20S%20Second%20Ave,%20Minneapolis,%20MN%20%2555403,%20United%20States&coordinate=44.969656,-93.273711&name=Minneapolis%20Convention%20Center&place-id=IAB62E16EF76187A8&map=explore'
		},
		{
			day: 'Friday, June 27',
			time: '7:00 am - 6:00 pm',
			event: '📚 CE Sessions',
			notes:
				'Another full day of Continuing Education sessions. Remember to use the mobile app to manage your schedule and find specific room locations within the Minneapolis Convention Center.',
			required: false,
			category: 'education',
			location:
				'https://maps.apple.com/place?address=1301%20S%20Second%20Ave,%20Minneapolis,%20MN%20%2555403,%20United%20States&coordinate=44.969656,-93.273711&name=Minneapolis%20Convention%20Center&place-id=IAB62E16EF76187A8&map=explore'
		},
		{
			day: 'Friday, June 27',
			time: '8:00 am - 9:00 am',
			event: '🥐 Symposium Breakfasts',
			notes: 'Breakfast provided for symposium attendees.',
			required: false,
			category: 'meal',
			location:
				'https://maps.apple.com/place?address=1301%20S%20Second%20Ave,%20Minneapolis,%20MN%20%2555403,%20United%20States&coordinate=44.969656,-93.273711&name=Minneapolis%20Convention%20Center&place-id=IAB62E16EF76187A8&map=explore'
		},
		{
			day: 'Friday, June 27',
			time: '8:30 am - 11:30 am',
			event: '🏛️ House of Delegates',
			notes: 'The second day of the official meeting for the House of Delegates.',
			required: false,
			category: 'meeting',
			location:
				'https://maps.apple.com/place?address=1301%20S%20Second%20Ave,%20Minneapolis,%20MN%20%2555403,%20United%20States&coordinate=44.969656,-93.273711&name=Minneapolis%20Convention%20Center&place-id=IAB62E16EF76187A8&map=explore'
		},
		{
			day: 'Friday, June 27',
			time: '9:00 am - 4:30 pm',
			event: '👀 Eye Care Square: Exhibit Hall',
			notes:
				'The Exhibit Hall is open for its final full day. This is a great opportunity for last-minute visits to exhibitors, the Innovation Wellness booth, Pickleball court, "Eye Deserve More" booth, and Aesthetics Avenue hub. Located in Halls B, C, D, and E of the Minneapolis Convention Center. Please remember to thank the sponsors who support AOSA and this meeting!', // Updated notes
			required: false,
			category: 'exhibit',
			location:
				'https://maps.apple.com/place?address=1301%20S%20Second%20Ave,%20Minneapolis,%20MN%20%2555403,%20United%20States&coordinate=44.969656,-93.273711&name=Minneapolis%20Convention%20Center&place-id=IAB62E16EF76187A8&map=explore',
			room: 'Exhibit Hall'
		},
		{
			day: 'Friday, June 27',
			time: '10:30 am - 12 pm',
			event: '🎤 EYETalks Stage',
			notes:
				'Final opportunities to attend presentations at the EYETalks Stage within the Exhibit Hall.',
			required: false,
			category: 'session',
			location:
				'https://maps.apple.com/place?address=1301%20S%20Second%20Ave,%20Minneapolis,%20MN%20%2555403,%20United%20States&coordinate=44.969656,-93.273711&name=Minneapolis%20Convention%20Center&place-id=IAB62E16EF76187A8&map=explore',
			room: 'Exhibit Hall'
		},
		{
			day: 'Friday, June 27',
			time: '12:00 pm - 1:00 pm',
			event: '🥪 Symposium Lunches',
			notes: 'Lunch options available for symposium attendees.',
			required: false,
			category: 'meal',
			location:
				'https://maps.apple.com/place?address=1301%20S%20Second%20Ave,%20Minneapolis,%20MN%20%2555403,%20United%20States&coordinate=44.969656,-93.273711&name=Minneapolis%20Convention%20Center&place-id=IAB62E16EF76187A8&map=explore'
		},
		{
			day: 'Friday, June 27',
			time: '1:00 pm - 3:00 pm',
			event: '🧑‍⚕️ AOA+ Residency and Graduate Education Summit & Career Fair',
			notes:
				'This summit focuses on residency and graduate education opportunities, and runs concurrently with the Career Fair, offering attendees the chance to connect with potential employers and residency programs. Both events are located within the Eye Care Square Exhibit Hall.',
			required: true,
			category: 'career',
			location:
				'https://maps.apple.com/place?address=1301%20S%20Second%20Ave,%20Minneapolis,%20MN%20%2555403,%20United%20States&coordinate=44.969656,-93.273711&name=Minneapolis%20Convention%20Center&place-id=IAB62E16EF76187A8&map=explore',
			room: 'Exhibit Hall; Booth 1653' // Added room
		},
		{
			day: 'Friday, June 27',
			time: '4:00 pm - 6:00 pm',
			event: '🏅 2025 National Optometry Hall of Fame Induction & AOA Advocacy Awards Ceremony',
			notes:
				'A prestigious event honoring new inductees into the National Optometry Hall of Fame and recognizing recipients of AOA Advocacy Awards.',
			required: false,
			category: 'ceremony',
			location:
				'https://maps.apple.com/place?address=1301%20S%20Second%20Ave,%20Minneapolis,%20MN%20%2555403,%20United%20States&coordinate=44.969656,-93.273711&name=Minneapolis%20Convention%20Center&place-id=IAB62E16EF76187A8&map=explore',
			room: 'Ballroom AB'
		},
		{
			day: 'Friday, June 27',
			time: '6:00 pm - 7:00 pm',
			event: "🍻 Young OD Reception | Brit's Pub",
			notes:
				"A dedicated networking event for young optometrists, held at Brit's Pub. A great opportunity for early-career professionals to connect in a casual setting.",
			required: false,
			category: 'networking',
			location:
				'https://maps.apple.com/place?address=1110%20Nicollet%20Mall,%20Minneapolis,%20MN%2055403,%20United%20States&coordinate=44.976219,-93.276862&name=Brit%27s%20Pub&place-id=I5432EC09FA1FD2C6&map=explore'
		},
		{
			day: 'Friday, June 27',
			time: '7:00 pm - 10:00 pm',
			event: '🎉 Celebration of Optometry',
			notes:
				'An unforgettable evening event held at Orchestra Hall & Peavey Plaza, supported by BAUSCH + LOMB. This dynamic indoor/outdoor experience in the heart of downtown Minneapolis features mainstage entertainment by Chase & The Ovations, performing Prince favorites. It offers a prime opportunity to relax, connect, and celebrate a successful week together. Attire is Smart Casual. Note: A separate, exclusive VIP Experience is also available at Orchestra Hall during these hours for VIP guests. This event is a 6-minute walk from the Convention Center. Please ensure you purchased a ticket for this event during registration. You will NOT be admitted without a ticket. If you need to add this event, visit the OM registration desk BEFORE Friday!', // Updated notes
			required: true,
			category: 'celebration',
			location:
				'https://maps.apple.com/place?address=1111%20Nicollet%20Mall,%20Minneapolis,%20MN%20%2055403,%20United%20States&coordinate=44.972225,-93.274961&name=Orchestra%20Hall&place-id=IF712022ABF1649C4&map=explore'
		},
		{
			day: 'Friday, June 27',
			time: '7:00 pm - 10:00 pm',
			event: '✨ VIP Experience Orchestra Hall',
			notes:
				'An exclusive experience for VIP guests attending the Celebration of Optometry. This refined lounge offers private access, elevated food and beverage offerings beyond the general event service, and is designed for deeper connection and celebration with AOA leadership, key partners, and honored guests as a special thank-you.',
			required: false,
			category: 'networking',
			location:
				'https://maps.apple.com/place?address=1111%20Nicollet%20Mall,%20Minneapolis,%20MN%2055403,%20United%20States&coordinate=44.976135,-93.276932&name=Minneapolis%20Orchestra%20Hall&place-id=I8A4F9FA29A91CD9A&map=explore'
		},
		{
			day: 'Saturday, June 28',
			time: '5:00 am',
			event: '🚌 Run/Walk Transportation',
			notes:
				'Transportation will be provided for participants of the Optometry Cares® The AOA Foundation Run/Walk to Crosby Farms Regional Park. Attendees should confirm pickup locations and times via the mobile app or event signage.',
			required: false,
			category: 'transportation'
		},
		{
			day: 'Saturday, June 28',
			time: '6:00 am - 8:00 am',
			event: '🏃 Optometry Cares® The AOA Foundation Run/Walk | Crosby Farms Regional Park',
			notes:
				'Join this charitable run/walk event to support Optometry Cares® The AOA Foundation. Held at Crosby Farms Regional Park, it offers a great way to start the day with activity and philanthropy. This is a ticketed event; please register in advance. You can also register and donate without participating in the run/walk.', // Updated notes
			required: false,
			category: 'activity',
			location:
				'https://maps.apple.com/place?address=2595%20Crosby%20Farm%20Rd,%20Saint%20Paul,%20MN%2055116,%20United%20States&coordinate=44.931698,-93.180016&name=Crosby%20Farm%20Regional%20Park&place-id=I4FF6DB1E55527B66&map=explore'
		},
		{
			day: 'Saturday, June 28',
			time: '7:00 am - 3:00 pm',
			event: '📚 CE Sessions',
			notes:
				'The final day for Continuing Education sessions. Plan to attend early to complete any remaining credit requirements. Check the mobile app for specific course times and locations within the Minneapolis Convention Center.',
			required: false,
			category: 'education',
			location:
				'https://maps.apple.com/place?address=1301%20S%20Second%20Ave,%20Minneapolis,%20MN%20%2555403,%20United%20States&coordinate=44.969656,-93.273711&name=Minneapolis%20Convention%20Center&place-id=IAB62E16EF76187A8&map=explore'
		},
		{
			day: 'Saturday, June 28',
			time: '8:00 am - 9:00 am',
			event: '🥐 Symposium Breakfast',
			notes: 'Breakfast available for symposium attendees on the last day of the meeting.',
			required: false,
			category: 'meal',
			location:
				'https://maps.apple.com/place?address=1301%20S%20Second%20Ave,%20Minneapolis,%20MN%20%2555403,%20United%20States&coordinate=44.969656,-93.273711&name=Minneapolis%20Convention%20Center&place-id=IAB62E16EF76187A8&map=explore'
		},
		{
			day: 'Saturday, June 28',
			time: '9:00 am - 11:30 am',
			event: '🏛️ House of Delegates',
			notes: 'The final session of the House of Delegates meeting.',
			required: false,
			category: 'meeting',
			location:
				'https://maps.apple.com/place?address=1301%20S%20Second%20Ave,%20Minneapolis,%20MN%20%2555403,%20United%20States&coordinate=44.969656,-93.273711&name=Minneapolis%20Convention%20Center&place-id=IAB62E16EF76187A8&map=explore',
			room: 'Ballroom AB'
		},
		{
			day: 'Saturday, June 28',
			time: '12:00 pm - 1:00 pm',
			event: '🥪 Symposium Lunch',
			notes: 'Lunch available for symposium attendees before the close of the meeting.',
			required: false,
			category: 'meal',
			location:
				'https://maps.apple.com/place?address=1301%20S%20Second%20Ave,%20Minneapolis,%20MN%20%2555403,%20United%20States&coordinate=44.969656,-93.273711&name=Minneapolis%20Convention%20Center&place-id=IAB62E16EF76187A8&map=explore'
		},
		{
			day: 'Saturday, June 28',
			time: 'Varies',
			event: '📦 All Shipments Ready for pickup',
			notes:
				'A general note for the end of the meeting indicating that all exhibition and other large shipments will be ready for collection from the Minneapolis Convention Center. Specific pickup instructions will be provided onsite.',
			required: false,
			category: 'logistics',
			location:
				'https://maps.apple.com/place?address=1301%20S%20Second%20Ave,%20Minneapolis,%20MN%20%2555403,%20United%20States&coordinate=44.969656,-93.273711&name=Minneapolis%20Convention%20Center&place-id=IAB62E16EF76187A8&map=explore'
		}
	]);

	// Enhanced UI State with multiple filters
	searchTerm = $state('');
	filters = $state<FilterState>({
		requirementFilter: 'all',
		selectedDays: new Set<string>(),
		selectedCategories: new Set<string>()
	});
	viewMode = $state<'cards' | 'table'>('cards');
	showCategoryFilters = $state(false);

	// Category colors mapping - simplified to neutral colors
	categoryColors = {
		education: 'badge-ghost',
		networking: 'badge-ghost',
		meal: 'badge-ghost',
		session: 'badge-ghost',
		meeting: 'badge-ghost',
		exhibit: 'badge-ghost',
		competition: 'badge-ghost',
		entertainment: 'badge-ghost',
		special: 'badge-ghost',
		career: 'badge-ghost',
		ceremony: 'badge-ghost',
		celebration: 'badge-ghost',
		transportation: 'badge-ghost',
		activity: 'badge-ghost',
		logistics: 'badge-ghost'
	};

	// Computed properties
	filteredSchedule = $derived.by(() => {
		return this.schedule.filter((item) => {
			// Search filter
			const matchesSearch =
				item.event.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
				(item.notes || '').toLowerCase().includes(this.searchTerm.toLowerCase()) ||
				item.time.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
				item.day.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
				(item.room || '').toLowerCase().includes(this.searchTerm.toLowerCase()); // Added room to search filter

			// Requirement filter
			const matchesRequirement =
				this.filters.requirementFilter === 'all' ||
				(this.filters.requirementFilter === 'required' && item.required) ||
				(this.filters.requirementFilter === 'optional' && !item.required);

			// Day filter
			const matchesDay =
				this.filters.selectedDays.size === 0 || this.filters.selectedDays.has(item.day);

			// Category filter
			const matchesCategory =
				this.filters.selectedCategories.size === 0 ||
				this.filters.selectedCategories.has(item.category);

			return matchesSearch && matchesRequirement && matchesDay && matchesCategory;
		});
	});

	uniqueDays = $derived.by(() => {
		return [...new Set(this.schedule.map((item) => item.day))];
	});

	uniqueCategories = $derived.by(() => {
		return [...new Set(this.schedule.map((item) => item.category))];
	});

	requiredCount = $derived(this.schedule.filter((item) => item.required).length);

	activeFiltersCount = $derived.by(() => {
		let count = 0;
		if (this.filters.requirementFilter !== 'all') count++;
		count += this.filters.selectedDays.size;
		count += this.filters.selectedCategories.size;
		return count;
	});

	// Methods
	getCategoryColor(category: string): string {
		return this.categoryColors[category as keyof typeof this.categoryColors] || 'badge-ghost';
	}

	getCategoryDisplayName(category: string): string {
		const displayNames: Record<string, string> = {
			education: '📚 Education',
			networking: '🤝 Networking',
			meal: '🍽️ Meals',
			session: '📊 Sessions',
			meeting: '🏛️ Meetings',
			exhibit: '🏢 Exhibits',
			competition: '🏆 Competition',
			entertainment: '🎭 Entertainment',
			ceremony: '🎖️ Ceremony',
			celebration: '🎉 Celebration',
			transportation: '🚌 Transport',
			activity: '🏃‍♂️ Activities',
			logistics: '📦 Logistics',
			career: '💼 Career'
		};
		return displayNames[category] || category;
	}

	clearSearch(): void {
		this.searchTerm = '';
	}

	setRequirementFilter(filter: 'all' | 'required' | 'optional'): void {
		this.filters.requirementFilter = filter;
	}

	toggleDayFilter(day: string): void {
		const newDays = new Set(this.filters.selectedDays);
		if (newDays.has(day)) {
			newDays.delete(day);
		} else {
			newDays.add(day);
		}
		this.filters.selectedDays = newDays;
	}

	toggleCategoryFilter(category: string): void {
		const newCategories = new Set(this.filters.selectedCategories);
		if (newCategories.has(category)) {
			newCategories.delete(category);
		} else {
			newCategories.add(category);
		}
		this.filters.selectedCategories = newCategories;
	}

	clearAllFilters(): void {
		this.searchTerm = '';
		this.filters = {
			requirementFilter: 'all',
			selectedDays: new Set<string>(),
			selectedCategories: new Set<string>()
		};
	}

	setViewMode(mode: 'cards' | 'table'): void {
		this.viewMode = mode;
	}
}
