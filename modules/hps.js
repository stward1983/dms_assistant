'use strict';

// Load local modules.
const discord = require('./discord');

// Define the HPs model.
let hps = {

  /**
   * Show the hit point total for the given user and tracker name. If a channel
   * ID is provided, the hit point total will be sent as a Discord message.
   * Otherwise, the hit point total will be returned as a string.
   *
   * @param user
   * @param hp
   * @param channelID
   * @returns {string}
   */
  show: (user, hp, channelID = false) => {
    let message = hp + '\'s HP: ' + hps[user][hp].current + ' / ' + hps[user][hp].max;
    if (hps[user][hp].current === 0) {
      message += ' (Staggered)';
    }
    else if (hps[user][hp].current < 0) {
      message += ' (Dying/Dead)';
    }
    if (channelID) {
      discord.channelID = channelID;
      discord.simpleMessage(message);
    }
    else {
      return message;
    }
  }
};

module.exports = hps;