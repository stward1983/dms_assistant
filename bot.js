'use strict';

// Load third-party dependencies.
require('dotenv').load();
const XMLHttpRequest = require('xmlhttprequest').XMLHttpRequest;

// Load local modules.
const discord = require('./modules/discord');
let hps = require('./modules/hps');

// Display a command line notice.
discord.on('ready', (event) => {
  console.log('At your service.');
});

// Listen for commands beginning with "!".
let last_initiative = {};
discord.on('message', (user, userID, channelID, message, event) => {
  if (message.substring(0, 1) === '!') {
    discord.channelID = channelID;
    let args = message.substring(1).split(' ');
    let output = '';
    let request = new XMLHttpRequest();
    switch (args[0]) {

        // Roll a check for every party member.
      case 'check':
        let request_url = process.env.BASE_URL + 'check/' + args[1] + '/json';
        if (typeof args[2] !== 'undefined' && args[2].length > 0) {
          request_url += '/' + encodeURIComponent(args[2]);
        }
        request.open('GET', request_url, false);
        request.send(null);
        output = JSON.parse(request.responseText);
        if (args[1] === 'initiative') {
          discord.sendMessage({
            to: discord.channelID,
            message: "Rolling Initiative...\n" + output.output
          }, (error, response) => {
            if (typeof last_initiative[channelID] !== 'undefined') {
              discord.deletePinnedMessage({
                channelID: discord.channelID,
                messageID: last_initiative[channelID]
              });
            }
            discord.pinMessage({
              channelID: discord.channelID,
              messageID: response.id
            });
            last_initiative[channelID] = response.id;
          });
        }
        else {
          discord.simpleMessage('Rolling ' + output.check_name + "...\n" + output.output);
        }
        break;

        // Display text explaining the different DM's Assistant commands.
      case 'help':
        discord.simpleMessage("Use me to help manage life at the gaming table..\n" +
            "**!check Check Others** - Roll the given check (e.g., initiative, perception) for all characters in the party and display them in order from highest to lowest. You can add extra characters to the check as an optional third parameter using comma-separated name|modifier pairs (e.g., Character1|+5,Character2|-3).\n" +
            "**!hp** - Keep track of named hit point totals. Use \"!hp help\" for a list of subcommands.\n" +
            "**!roll Dice** - Roll the given dice expression (e.g., 1d10, 2d8+4, etc.).\n" +
            "**!show Thing** - Show the name, description, and image (if available) for the given encounter, location, or NPC in chat. Note that only the DM can show things that haven't been published on the website, and they are published for everyone's later reference when he does.\n"
        );
        break;

      // Interact with the hit point tracker.
      case 'hp':
        if (typeof hps[user] === 'undefined') {
          hps[user] = {};
        }
        switch (args[1]) {

          // Clear all of the user's hit point tracker totals.
          case 'clear':
            hps[user] = {};
            discord.simpleMessage('All of your hit point trackers have been cleared.');
            break;

          // Display text explaining the different hit point tracker commands.
          case 'help':
            discord.simpleMessage("Use the !hp feature to track hit points.\n" +
                "**!hp set Name Total** - Start tracking a new set of hit points with the given name and total.\n" +
                "**!hp Name** - Show the current hit point total for the given name.\n" +
                "**!hp Name Amount** - Change the current hit point total for the given name by the given amount. Use positive amounts for healing and negative amounts for damage.\n" +
                "**!hp list** - Show all of your hit point trackers.\n" +
                "**!hp clear** - Clear all of your hit point trackers."
            );
            break;

          // List all of the user's hit point tracker totals.
          case 'list':
            let list = [];
            Object.keys(hps[user]).forEach((hp) => {
              if (hps[user].hasOwnProperty(hp) && typeof hps[user][hp] !== 'function') {
                list.push(hps.show(user, hp, false));
              }
            });
            if (list.length > 0) {
              list.forEach((item, index) => {
                if (item !== 'undefined') {
                  output += item;
                  if (index < list.length - 1) {
                    output += "\n";
                  }
                }
              });
            }
            else {
              output = 'You are not currently tracking any hit points.';
            }
            discord.simpleMessage(output);
            break;

          // Set a hit point tracker total.
          case 'set':
            if (['clear', 'help', 'list', 'set', 'show'].indexOf(args[2]) > -1) {
              discord.simpleMessage('You cannot set a hit point tracker using a protected keyword (clear, help, list, set, or show).');
            }
            else {
              hps[user][args[2]] = {
                current: Number(args[3]),
                max: Number(args[3])
              };
              hps.show(user, args[2], channelID);
            }
            break;

          // Optionally change and then show a hit point tracker total.
          default:
            if (hps[user].hasOwnProperty([args[1]])) {
              if (args.length > 2) {
                hps[user][args[1]].current += Number(args[2]);
                hps[user][args[1]].current = Math.min(hps[user][args[1]].current, hps[user][args[1]].max);
              }
              hps.show(user, args[1], channelID);
            }
            else {
              discord.simpleMessage('You are not currently tracking any hit points for a character named "' + args[1] + '." Use "!hp help" for a list of commands.');
            }
            break;
        }
        break;

      // Roll the given dice expression.
      case 'roll':
        let multiplier = 1;
        let result = 0;
        let rolls = [];
        let roll;
        args.shift();
        args.join().replace(/[^\d+\-d]/gi, '').split(/(?=[+-])/).forEach((roll_part) => {
          multiplier = 1;
          if (roll_part[1] === '-') {
            multiplier = -1;
            roll_part = roll_part.substring(1);
          }
          else if (roll_part[0] === '+') {
            roll_part = roll_part.substring(1);
          }
          if (roll_part.indexOf('d') > -1) {
            let [dice, sides] = roll_part.split('d');
            for (var i = 0; i < dice; i++) {
              roll = Math.floor(Math.random() * sides) + 1;
              rolls.push('d' + sides + ' (' + roll + ')');
              result += roll * multiplier;
            }
          }
          else {
            result += Number(roll_part) * multiplier;
          }
        });
        if (rolls.length > 0) {
          discord.simpleMessage('Rolls: ' + rolls.join(', '));
        }
        discord.simpleMessage('Result: ' + result);
        break;

      // Show the name, description, and image of the given character,
      // encounter, or location.
      case 'show':
        args.shift();
        let query = args.join(' ');
        request.open('GET', process.env.BASE_URL + 'show?userID=' + userID + '&query=' + encodeURIComponent(query), false);
        request.send(null);
        output = JSON.parse(request.responseText);
        if (output.error) {
          discord.simpleMessage(output.error);
        }
        else {
          discord.simpleMessage(output.output.replace('&nbsp;', ' '));
        }
        break;

      // Show an error for unsupported commands.
      default:
        discord.simpleMessage('I\'m sorry. I do not recognize the "' + args[1] + '" command. Use "!help" for a list of commands.');
        break;
    }
  }
});
