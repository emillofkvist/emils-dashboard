// ============================================
// DASHBOARD KONFIGURATION
// ============================================

const CONFIG = {
    // Plats för väder (Hyllinge koordinater)
    weather: {
        lat: 56.1167,
        lon: 12.8167,
        name: "Hyllinge"
    },

    // Google Kalender via iCal (ingen API-nyckel behövs!)
    calendar: {
        icalUrl: "https://calendar.google.com/calendar/ical/sknmh9g9k0tre2pd5jab56nmho%40group.calendar.google.com/private-318e0453381fda1243001d48234c511e/basic.ics",
        enabled: true
    },

    // RSS-proxy för att undvika CORS-problem
    corsProxy: "https://api.allorigins.win/raw?url=",

    // Alternativ proxy för kalender
    calendarProxy: "https://corsproxy.io/?",

    // Svenska nyheter - SVT och DN
    newsFeeds: [
        { name: "SVT Nyheter", url: "https://www.svt.se/nyheter/rss.xml" },
        { name: "DN",          url: "https://www.dn.se/rss/" }
    ],

    // Macworld Sverige RSS (visar artiklar från senaste 24h)
    macworldFeed: "https://www.macworld.se/feed",

    // Feber RSS (5 senaste)
    feberFeed: "https://feber.se/rss/",

    // AI-nyheter via TechCrunch (direktlänkar = reader fungerar)
    aiNewsFeeds: [
        { name: "TechCrunch", url: "https://techcrunch.com/category/artificial-intelligence/feed/" },
        { name: "The Verge",  url: "https://www.theverge.com/ai-artificial-intelligence/rss/index.xml" }
    ],
    maxAiNews: 5,

    // Porsche nyheter via Car and Driver (direktlänkar = reader fungerar)
    porscheFeed: "https://www.caranddriver.com/rss/porsche.xml",
    maxPorscheNews: 5,

    // Hur många nyheter att visa (SVT + DN)
    maxNews: 5
};
