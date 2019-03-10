'use strict';

// Load third-party dependencies.
require('dotenv').load();
const Discord = require('discord.io');

// Configure the Discord client.
const discord = new Discord.Client({
  token: process.env.DISCORD_TOKEN,
  autorun: true
});

/**
 * Send a message.
 *
 * @param channelID
 * @param message
 */
discord.simpleMessage = (message) => {
  discord.sendMessage({
    to: discord.channelID,
    message: message
  });
};

module.exports = discord;