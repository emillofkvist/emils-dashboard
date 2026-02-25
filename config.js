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
        { name: "The Verge",  url: "https://www.theverge.com/rss/index.xml" }
    ],
    maxAiNews: 5,

    // Porsche nyheter — blandning av källor
    porscheFeeds: [
        { url: "https://carscoops.com/tag/porsche/feed/",       filter: false }, // Porsche-specifik
        { url: "https://www.roadandtrack.com/rss/all.xml",      filter: true  }, // filtrera på "porsche"
        { url: "https://www.motor1.com/rss/news/all/",          filter: true  }  // filtrera på "porsche"
    ],
    maxPorscheNews: 5,

    // Hur många nyheter att visa (SVT + DN)
    maxNews: 5
};
