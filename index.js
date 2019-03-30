var Discord = require("discord.js");
var fs = require("fs");
var firebase = require("firebase-admin");
var serviceAccount = require(__dirname + "/settings/serviceAccountKey.json");

const {
  Client,
  MessageEmbed,
  DMChannel
} = require('discord.js');

const client = new Client();

function settings() {
  // Reading settings.json file
  var settings = fs.readFileSync(__dirname + "/settings/settings.json");
  var jsonContent = JSON.parse(settings);
  // assining discord bot token and firebase config vars
  var token = (jsonContent.token);
  var apiKey = (jsonContent.apiKey);
  var storageBucket = (jsonContent.storageBucket);
  var authDomain = (jsonContent.authDomain);
  var databaseURL = (jsonContent.databaseURL);
  var guildId = (jsonContent.guildId);
  var roleId = (jsonContent.roleId);
  // Initializing firebase
  firebase.initializeApp({
    apiK: apiKey,
    authDomain: authDomain,
    databaseURL: databaseURL,
    storageBucket: storageBucket,
    credential: firebase.credential.cert(serviceAccount),
  });
  var ref = firebase.app().database().ref("discordKeys");
  runDiscordBot(token, ref, guildId, roleId);
}

function runDiscordBot(token, ref, guildId, roleId) {
  client.on('ready', () => {
    console.log('Running Bot: ' + token);
  });
  // on msg
  client.on('message', message => {
    if (message.author.bot) return;
    // if dm
    if (message.channel.type == "dm") {
      // split message by space
      var messageSplit = message.content.split(" ");
      // if command is .help
      if (messageSplit[0] == ".help") {
        help(messageSplit, message);
      }
      // if user is using activate command.
      if (messageSplit[0] == ".activate") {
        activateUser(messageSplit, message, ref, guildId, roleId);
      }
      if (messageSplit[0] == ".deactivate") {
        deactivateUser(messageSplit, message, ref, guildId, roleId);
      }
      if (messageSplit[0] == ".key") {
        checkKey(messageSplit, message, ref);
      }
    }
  });

  // Log our bot in using the token
  client.login(token)

}

function help(messageSplit, message) {
  console.log("User Performed: " + messageSplit[0]);
  message.author.send({
    embed: {
      color: 3447003,
      title: "Authentication Bot",
      description: "Use one of the following commands\n !activate (password) \n !deactivate \n !key (To show which key you're bound to) \n Please note do not enclose the password with ()"
    }
  });
  return;
}

function activateUser(messageSplit, message, ref, guildId, roleId) {
  console.log("User Performed: " + messageSplit[0]);
  try {
    // encoding user inputed string via base64 because firebase doesnt allow some symbols
    var key = (Buffer.from(messageSplit[1]).toString('base64'));
    // getting current data in our databse.
    // checking if the user is already a member
    var user = (client.guilds.get(guildId).members.get(message.author.id));
    if(user.roles.has(roleId)) {
      message.author.send({
        embed: {
          color: 3447003,
          title: "Authentication Bot",
          description: "You are already a member..."
        }
      });
      return;
    } else {
      // User is not a member.
      ref.once("value")
        .then(function(snap) {
          var data = snap.val();
          var keyFound = false;
          // going through data
          for (var i in data) {
            // if current key in db matches with user inputed key.
            if (i == key) {
              keyFound = true;
              // Key Found in database
              // Getting the user activated to the current key
              var currentUser = (data[i]);
              // if None was found under current user in database.
              if (currentUser == "none") {
                // Give the user the role.
                var userId = message.author.id;
                const guildMember = message.member;
                client.guilds.get(guildId).members.get(message.author.id).addRole(roleId);
                //Update the database with the user id.
                var userId = message.author.id;
                update_array = {};
                update_array[i] = userId;
                // pushing to the database.
                ref.update(update_array);
                message.author.send({
                  embed: {
                    color: 3447003,
                    title: "Authentication Bot",
                    description: "You are now binded to: " + Buffer.from(i, 'base64') //decoding the key to return it to the user.
                  }
                });
                return;
              } else {
                // Value is not none for user in database.
                message.author.send({
                  embed: {
                    color: 3447003,
                    title: "Authentication Bot",
                    description: "Key is already binded."
                  }
                });
                return;
              }

            }
          }
          // key not found in database
          if (!keyFound) {
            // return message to user telling him to check key
            message.author.send({
              embed: {
                color: 3447003,
                title: "Authentication Bot",
                description: "Key not found..."
              }
            });
            return;
          }
        });
      }
  } catch {
    message.author.send({
      embed: {
        color: 3447003,
        title: "Authentication Bot",
        description: "Unexcpected error occured... Please contact admin or try typing !help"
      }
    });
    return;
  }
}

function deactivateUser(messageSplit, message, ref, guildId, roleId) {
  console.log("User Performed: " + messageSplit[0]);
  try {
    ref.once("value")
      .then(function(snap) {
        var data = snap.val();
        var userFound = false;
        // going through data
        for (var i in data) {
          var activatedUser = (data[i]);
          // Getting the users discord id
          var userId = message.author.id;
          // if the user sending the message and the user in the db match
          if (activatedUser == userId) {
            // updating database
            var userFound = true;
            update_array = {};
            update_array[i] = "none";
            // pushing to the database.
            ref.update(update_array);
            // Removing the role from the user
            client.guilds.get(guildId).members.get(message.author.id).removeRole(roleId);
            message.author.send({
              embed: {
                color: 3447003,
                title: "Authentication Bot",
                description: "You are now unbinded."
              }
            });
            return;
          }
        }
        // user not found in database
        if (!userFound) {
          // return message to user telling him no key is bound to him.
          message.author.send({
            embed: {
              color: 3447003,
              title: "Authentication Bot",
              description: "You are not bound to a key."
            }
          });
          return;
        }
      });
  } catch {
    message.author.send({
      embed: {
        color: 3447003,
        title: "Authentication Bot",
        description: "Unexcpected error occured... Please contact admin or try typing !help"
      }
    });
    return;
  }
}

function checkKey(messageSplit, message, ref) {
  console.log("User Performed: " + messageSplit[0]);
  try {
    ref.once("value")
      .then(function(snap) {
        var data = snap.val();
        var userFound = false;
        // going through data
        for (var i in data) {
          var activatedUser = (data[i]);
          // Getting the users discord id
          var userId = message.author.id;
          // if the user sending the message and the user in the db match
          if (activatedUser == userId) {
            // send user his key
            message.author.send({
              embed: {
                color: 3447003,
                title: "Authentication Bot",
                description: "Your key is: " + Buffer.from(i, 'base64') //decoding key to return to user.
              }
            });
            return;
          }
        }
        // user not found in database
        if (!userFound) {
          // return message to user telling him no key is bound to him.
          message.author.send({
            embed: {
              color: 3447003,
              title: "Authentication Bot",
              description: "You are not bound to a key."
            }
          });
          return;
        }
      });
  } catch {
    message.author.send({
      embed: {
        color: 3447003,
        title: "Authentication Bot",
        description: "Unexcpected error occured... Please contact admin or try typing !help"
      }
    });
    return;
  }
}
settings();
