const { GuildScheduledEventEntityType } = require("discord.js");

const fetchEvents = async (guild) => {
    const events = await guild.scheduledEvents.fetch();
    return events
        .filter(
            (event) =>
                event.entityType == GuildScheduledEventEntityType.External,
        )
        .map((event) => ({
            uid: event.id,
            name: event.name,
            description: event.description,
            location: event.entityMetadata.location,
            start: event.scheduledStartAt,
            end: event.scheduledEndAt,
            created: event.createdAt,
        }));
};

const dateToICal = (date) => {
    return (
        date
            .toISOString()
            .replaceAll(":", "")
            .replaceAll("-", "")
            .split(".")[0] + "Z"
    );
};

const wrapICal = (data) => data.replace("\n", "\\r\\n");

const generateICal = (name, domain, lang, events) => {
    const lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        `PRODID:+//IDN ${domain}//${name}//${lang}`,
        "CALSCALE:GREGORIAN",
        `NAME:${name}`,
        "METHOD:PUBLISH",
    ];

    for (let event of events) {
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
