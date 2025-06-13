export interface ScheduleItem {
	day: string;
	time: string;
	event: string;
	notes?: string;
	required: boolean;
	category: string;
}

export interface FilterState {
	requirementFilter: 'all' | 'required' | 'optional';
	selectedDays: Set<string>;
	selectedCategories: Set<string>;
}

export class OMScheduleLogic {
	schedule: ScheduleItem[] = $state([
		{
			day: "Throughout the Meeting",
			time: "Varies",
			event: "🎓 Earn at least 5 CE credits",
			notes:
				"Times and locations for CE credits vary throughout the Minneapolis Convention Center.",
			required: true,
			category: "education",
		},
		{
			day: "Tuesday, June 24",
			time: "6:00 pm - 7:30 pm",
			event: "🤝 Innovation Hub Reception",
			notes:
				"Part of the Innovation Hub program, which includes an Opening Panel: The Eye, and is held at Hilton Minneapolis.",
			required: false,
			category: "networking",
		},
		{
			day: "Wednesday, June 25",
			time: "8:00 am - 9:00 am",
			event: "🥐 Symposium Breakfast",
			notes: "",
			required: false,
			category: "meal",
		},
		{
			day: "Wednesday, June 25",
			time: "8:30 am - 12:15 pm",
			event: "💡 Innovation Hub",
			notes:
				"Includes Networking Breakfast & Tabletops (7:30-8:30 AM), Programming & Networking Breaks, Lunch Keynote & Discussion (12:30-1:30 PM), and Networking & Tabletops (1:30-2:00 PM).",
			required: false,
			category: "session",
		},
		{
			day: "Wednesday, June 25",
			time: "8:30 am - 12:30 pm",
			event: "🏛️ Presidents Council",
			notes: "",
			required: false,
			category: "meeting",
		},
		{
			day: "Wednesday, June 25",
			time: "9:00 am - 5:00 pm",
			event: "📚 CE Sessions",
			notes: "",
			required: false,
			category: "education",
		},
		{
			day: "Wednesday, June 25",
			time: "12:00 pm - 1:00 pm",
			event: "🥪 Symposium Lunch",
			notes: "",
			required: false,
			category: "meal",
		},
		{
			day: "Wednesday, June 25",
			time: "4:00 pm - 5:00 pm",
			event: "⭐ VIP Leadership Exchange Reception - New!",
			notes: "",
			required: false,
			category: "networking",
		},
		{
			day: "Wednesday, June 25",
			time: "4:30 pm - 5:15 pm",
			event: "👋 New Member Reception",
			notes: "",
			required: false,
			category: "networking",
		},
		{
			day: "Wednesday, June 25",
			time: "5:30 pm - 7:00 pm",
			event: "🚀 AOA Experience - Opening Session",
			notes:
				'Theme: "Ignite Your Vision – Experience Optometry". High-energy kickoff with AOA and WCO leadership, future-focused remarks, recognition of national awardees and AOSA student leaders, Keynote by Dr. Richard Edlow. Includes interactive seat messages + donation QR codes. Seamless transition into the Opening Reception at Eye Care Square.',
			required: false,
			category: "session",
		},
		{
			day: "Wednesday, June 25",
			time: "7:00 pm - 9:00 pm",
			event: "🎉 Eye Care Square: Exhibit Hall Opening Reception",
			notes:
				"Immediately follows the Opening General Session. Leverages a fully engaged, on-site audience. Drives early hall traffic and meaningful networking from day one. Establishes a dynamic, engaging tone for the full exhibit experience. Exhibit Hall hours for Wednesday are 7:00 pm - 9:00 pm.",
			required: false,
			category: "exhibit",
		},
		{
			day: "Wednesday, June 25",
			time: "7:30 pm - 8:30 pm",
			event: "🎤 EYETalks Stage",
			notes: "Located within the Exhibit Hall.",
			required: false,
			category: "session",
		},
		{
			day: "Thursday, June 26",
			time: "7:00 am - 8:00 pm",
			event: "📚 CE Sessions",
			notes: "",
			required: false,
			category: "education",
		},
		{
			day: "Thursday, June 26",
			time: "8:00 am - 9:00 am",
			event: "🥐 Symposium Breakfasts",
			notes: "",
			required: false,
			category: "meal",
		},
		{
			day: "Thursday, June 26",
			time: "8:30 am - 11:30 am",
			event: "🏛️ House of Delegates",
			notes: "",
			required: false,
			category: "meeting",
		},
		{
			day: "Thursday, June 26",
			time: "9:00 am - 4:30 pm",
			event: "👀 Eye Care Square: Exhibit Hall",
			notes:
				"Exhibit Hall hours for Thursday are 9:00 am - 4:30 pm. Attendees are encouraged to visit and thank companies that support students and AOSA. The Exhibit Hall features various activities and hubs.",
			required: false,
			category: "exhibit",
		},
		{
			day: "Thursday, June 26",
			time: "10:30 a.m.",
			event: "👓 EssilorLuxottica EyeFWD: Student Session",
			notes: "",
			required: true,
			category: "session",
		},
		{
			day: "Thursday, June 26",
			time: "11:30 am - 2:30 pm",
			event: "🎤 EYETalks Stage",
			notes: "Located within the Exhibit Hall.",
			required: false,
			category: "session",
		},
		{
			day: "Thursday, June 26",
			time: "12:00 pm - 1:00 pm",
			event: "🥪 Symposium Lunches",
			notes: "",
			required: false,
			category: "meal",
		},
		{
			day: "Thursday, June 26",
			time: "12:00 pm - 1:00 pm",
			event: "🔗 AOA+ Leadership Link Lunch",
			notes: "",
			required: false,
			category: "meal",
		},
		{
			day: "Thursday, June 26",
			time: "12:00 pm - 1:00 pm",
			event: "👓 Paraoptometric Appreciation Luncheon",
			notes: "",
			required: false,
			category: "meal",
		},
		{
			day: "Thursday, June 26",
			time: "1:00 p.m.",
			event: "🤝 Affiliate Connections",
			notes: "Located within the Exhibit Hall.",
			required: true,
			category: "networking",
		},
		{
			day: "Thursday, June 26",
			time: "1:00 pm - 3:00 pm",
			event: "💡 Paraoptometric Idea Exchange",
			notes: "",
			required: false,
			category: "session",
		},
		{
			day: "Thursday, June 26",
			time: "5:00 pm - 7:00 pm",
			event: "🍻 Alumni Receptions | Hilton",
			notes: "",
			required: false,
			category: "networking",
		},
		{
			day: "Thursday, June 26",
			time: "7:30 p.m.",
			event: "🏆 AOSA Optometry Student Bowl™ XXXIII, powered by EssilorLuxottica",
			notes:
				"Located at The Fillmore. (Note: The slideshow lists this as AOSA Optometry Student Bowl XXXIV powered by EssilorLuxottica and EssilorLuxottica Live! Student Reception, at 7:00 pm - 11:45 pm.)",
			required: true,
			category: "competition",
		},
		{
			day: "Thursday, June 26",
			time: "9:00 pm - 11:00 pm",
			event: "🎸 Eye Docs of Rock | Varsity Theater",
			notes: "",
			required: false,
			category: "entertainment",
		},
		{
			day: "Friday, June 27",
			time: "6:30 am - 6:15 am",
			event: "📸 ALL STAFF PICTURE",
			notes: "",
			required: false,
			category: "logistics",
		},
		{
			day: "Friday, June 27",
			time: "7:00 am - 6:00 pm",
			event: "📚 CE Sessions",
			notes: "",
			required: false,
			category: "education",
		},
		{
			day: "Friday, June 27",
			time: "8:00 am - 9:00 am",
			event: "🥐 Symposium Breakfasts",
			notes: "",
			required: false,
			category: "meal",
		},
		{
			day: "Friday, June 27",
			time: "8:30 am - 11:30 am",
			event: "🏛️ House of Delegates",
			notes: "",
			required: false,
			category: "meeting",
		},
		{
			day: "Friday, June 27",
			time: "9:00 am - 4:30 pm",
			event: "👀 Eye Care Square: Exhibit Hall",
			notes:
				"Exhibit Hall hours for Friday are 9:00 am - 4:30 pm. Attendees are encouraged to visit and thank companies that support students and AOSA. The Exhibit Hall features various activities and hubs.",
			required: false,
			category: "exhibit",
		},
		{
			day: "Friday, June 27",
			time: "10:30 am - 12 pm",
			event: "🎤 EYETalks Stage",
			notes: "Located within the Exhibit Hall.",
			required: false,
			category: "session",
		},
		{
			day: "Friday, June 27",
			time: "12:00 pm - 1:00 pm",
			event: "🥪 Symposium Lunches",
			notes: "",
			required: false,
			category: "meal",
		},
		{
			day: "Friday, June 27",
			time: "1:00 p.m.",
			event: "🧑‍⚕️ AOA+ Residency Summit & Career Fair",
			notes: "Located within the Exhibit Hall, runs until 3:00 pm.",
			required: true,
			category: "career",
		},
		{
			day: "Friday, June 27",
			time: "4:00 pm - 6:00 pm",
			event: "🏅 2025 National Optometry Hall of Fame Induction & AOA Advocacy Awards Ceremony",
			notes: "",
			required: false,
			category: "ceremony",
		},
		{
			day: "Friday, June 27",
			time: "6:00 pm - 7:00 pm",
			event: "🍻 Young OD Reception | Brit's Pub",
			notes: "",
			required: false,
			category: "networking",
		},
		{
			day: "Friday, June 27",
			time: "7:00 p.m.",
			event: "🎉 Celebration of Optometry",
			notes:
				"Located at Orchestra Hall, runs until 10:00 pm. Attire: Smart Casual. An unforgettable evening at Orchestra Hall & Peavey Plaza, supported by BAUSCH + LOMB. Dynamic indoor/outdoor experience. Mainstage entertainment featuring Chase & The Ovations performing Prince favorites. Opportunities to relax, connect, and celebrate. A VIP Experience is also available at Orchestra Hall from 7:00 pm - 10:00 pm.",
			required: true,
			category: "celebration",
		},
		{
			day: "Saturday, June 28",
			time: "5:00 am",
			event: "🚌 Run/Walk Transportation",
			notes: "For the Optometry Cares® The AOA Foundation Run/Walk.",
			required: false,
			category: "transportation",
		},
		{
			day: "Saturday, June 28",
			time: "6:00 am - 8:00 am",
			event: "🏃 Optometry Cares® The AOA Foundation Run/Walk | Crosby Farms Regional Park",
			notes: "",
			required: false,
			category: "activity",
		},
		{
			day: "Saturday, June 28",
			time: "7:00 am - 3:00 pm",
			event: "📚 CE Sessions",
			notes: "",
			required: false,
			category: "education",
		},
		{
			day: "Saturday, June 28",
			time: "8:00 am - 9:00 am",
			event: "🥐 Symposium Breakfast",
			notes: "",
			required: false,
			category: "meal",
		},
		{
			day: "Saturday, June 28",
			time: "9:00 am - 11:30 am",
			event: "🏛️ House of Delegates",
			notes: "",
			required: false,
			category: "meeting",
		},
		{
			day: "Saturday, June 28",
			time: "12:00 pm - 1:00 pm",
			event: "🥪 Symposium Lunch",
			notes: "",
			required: false,
			category: "meal",
		},
		{
			day: "Saturday, June 28",
			time: "Varies",
			event: "📦 All Shipments Ready for pickup",
			notes: "This is a general note for the end of the meeting.",
			required: false,
			category: "logistics",
		},
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
				item.day.toLowerCase().includes(this.searchTerm.toLowerCase());

			// Requirement filter
			const matchesRequirement =
				this.filters.requirementFilter === 'all' ||
				(this.filters.requirementFilter === 'required' && item.required) ||
				(this.filters.requirementFilter === 'optional' && !item.required);

			// Day filter
			const matchesDay =
				this.filters.selectedDays.size === 0 ||
				this.filters.selectedDays.has(item.day);

			// Category filter
			const matchesCategory =
				this.filters.selectedCategories.size === 0 ||
				this.filters.selectedCategories.has(item.category);

			return matchesSearch && matchesRequirement && matchesDay && matchesCategory;
		});
	});

	uniqueDays = $derived.by(() => {
		return [...new Set(this.schedule.map(item => item.day))];
	});

	uniqueCategories = $derived.by(() => {
		return [...new Set(this.schedule.map(item => item.category))];
	});

	requiredCount = $derived(
		this.schedule.filter(item => item.required).length
	);

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
			logistics: '📦 Logistics'
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

