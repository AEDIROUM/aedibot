const { Client, Events, GatewayIntentBits } = require("discord.js");
const express = require("express");
const { fetchEvents, generateICal } = require("./events");
const config = require('../config/config.json');

// Setup Discord link
const client = new Client({ intents: [GatewayIntentBits.Guilds] });
let guild;

client.once(Events.ClientReady, async (data) => {
    console.log(`Logged in to Discord as '${data.user.username}!'`);
    guild = await client.guilds.fetch(config.guildId);
    console.log(`Connected to server '${guild.name}'`);
});

client.login(config.token);

// Serve HTTP requests to get the calendar
const app = express();

app.get("/events.ics", async (req, res) => {
    const events = await fetchEvents(guild);
    res.send(generateICal(config.name, config.domain, config.lang, events));
});

app.listen(config.port, () => {
    console.log(`Now serving requests on port ${config.port}`);
});
