const { GuildScheduledEventEntityType } = require("discord.js");
const { open, mkdir } = require("node:fs/promises");

const cacheFolderPath = "cache/";
const cacheFilePath = cacheFolderPath + "events.json";

const cacheTime = 1000 * 60 * 5; // 5 minutes
let eventsCache = {
    updates: {},
    events: {},
};

// Read cached events from disk
(async () => {
    try {
        await mkdir(cacheFolderPath);
    } catch (err) {
        if (err.code != "EEXIST") {
            throw err;
        }
    }

    let cacheFile;

    try {
        cacheFile = await open(cacheFilePath, "r");
        eventsCache = JSON.parse(await cacheFile.readFile());
    } catch (err) {
        if (err.code != "ENOENT") {
            throw err;
        }
    } finally {
        await cacheFile?.close();
    }
})();

const fetchEvents = async (guild) => {
    if (
        !(guild.id in eventsCache.updates) ||
        !(guild.id in eventsCache.events) ||
        Date.now() - eventsCache.updates[guild.id] > cacheTime
    ) {
        // Retrieve events from the Discord API
        const rawEvents = await guild.scheduledEvents.fetch();
        const events = Object.fromEntries(
            rawEvents
                .filter(
                    (event) =>
                        event.entityType ==
                        GuildScheduledEventEntityType.External,
                )
                .map((event) => [
                    event.id,
                    {
                        uid: event.id,
                        name: event.name,
                        description: event.description,
                        location: event.entityMetadata.location,
                        start: event.scheduledStartAt.getTime(),
                        end: event.scheduledEndAt.getTime(),
                        created: event.createdAt.getTime(),
                    },
                ]),
        );

        // Merge with events in cache
        eventsCache.updates[guild.id] = Date.now();
        eventsCache.events[guild.id] = Object.assign(
            {},
            eventsCache.events[guild.id],
            events,
        );

        // Write new events in cache file
        let cacheFile;

        try {
            cacheFile = await open(cacheFilePath, "w");
            await cacheFile.writeFile(JSON.stringify(eventsCache));
        } finally {
            await cacheFile.close();
        }
    }

    return eventsCache.events[guild.id];
};

const dateToICal = (date) => {
    return (
        new Date(date)
            .toISOString()
            .replaceAll(":", "")
            .replaceAll("-", "")
            .split(".")[0] + "Z"
    );
};

const wrapICal = (data) => data.replace("\n", "\\n");

const generateICal = (name, domain, lang, events) => {
    const lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        `PRODID:+//IDN ${domain}//${name}//${lang}`,
        "CALSCALE:GREGORIAN",
        `NAME:${name}`,
        "METHOD:PUBLISH",
    ];

    for (let event of Object.values(events)) {
        let start = event.start;
        let end = event.end;

        if (end < start) {
            end = start;
        }

        lines.push(
            ...[
                "BEGIN:VEVENT",
                `SUMMARY:${event.name}`,
                `DESCRIPTION:${wrapICal(event.description)}`,
                `LOCATION:${event.location}`,
                `DTSTART:${dateToICal(start)}`,
                `DTEND:${dateToICal(end)}`,
                `DTSTAMP:${dateToICal(event.created)}`,
                `UID:${event.uid}@aediroum.ca`,
                "END:VEVENT",
            ],
        );
    }

    lines.push("END:VCALENDAR");
    return lines.join("\n");
};

exports.fetchEvents = fetchEvents;
exports.generateICal = generateICal;
