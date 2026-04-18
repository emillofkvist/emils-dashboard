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
    // cors.eu.org: append URL direkt (ingen encodeURIComponent, URL utan & i query funkar bäst)
    corsProxy: "https://cors.eu.org/",

    // Proxy för kalender (cors.eu.org funkar bra utan query-params med &)
    calendarProxy: "https://cors.eu.org/",

    // Svenska nyheter - SVT och DN
    newsFeeds: [
        { name: "SVT Nyheter", url: "https://www.svt.se/nyheter/rss.xml" },
        { name: "DN",          url: "https://www.dn.se/rss/" }
    ],

    // Macworld RSS (visar artiklar från senaste 24h)
    macworldFeed: "https://www.macworld.se/feed",
    macworldComFeed: "https://www.macworld.com/feed/",

    // Feber RSS (5 senaste)
    feberFeed: "https://feber.se/rss/",

    // Aftonbladet RSS (senaste nytt)
    aftonbladetFeed: "https://rss.aftonbladet.se/rss2/small/pages/sections/senastenytt/",
    maxAftonbladetNews: 8,

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
    maxNews: 5,

    // Gemini API-nyckel för AI-dagsbriefing (sparas i localStorage som 'gemini_api_key', inte här)
    anthropicApiKey: "",

    // Hemnet – villor/gårdar i område, senaste 48h
    // workerUrl: URL till Cloudflare Worker som proxar Hemnet (lämna "" tills Worker är deployad)
    hemnet: {
        searchUrl: "https://www.hemnet.se/bostader?item_types%5B%5D=villa&item_types%5B%5D=gard&expand_locations=10000&location_ids%5B%5D=956675",
        maxItems: 10,
        workerUrl: ""
    }
};
