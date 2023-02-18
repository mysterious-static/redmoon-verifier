const Discord = require('discord.js');
const { EmbedBuilder, SlashCommandBuilder, GatewayIntentBits, Partials, PermissionsBitField, PermissionFlagsBits, StringSelectMenuBuilder, RoleSelectMenuBuilder, ActionRowBuilder, ButtonBuilder } = require('discord.js');
const client = new Discord.Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildMessageReactions], partials: [Partials.Message, Partials.Channel, Partials.Reaction], });
var mysql = require('mysql2');
var fetch = require('node-fetch');
var crypto = require('node:crypto');
var connection = mysql.createConnection({
  host: process.env.db_host,
  user: process.env.db_user,
  password: process.env.db_pass,
  database: process.env.db,
  supportBigNumbers: true,
  bigNumberStrings: true,
  multipleStatements: true
});
var xivapi_private_key = process.env.apikey
var verify_string = ''; //retrieve from database
var bio = '';
var stickymessages = ''

var servers = ["Adamantoise", "Aegis", "Alexander", "Anima", "Asura", "Atomos", "Bahamut", "Balmung", "Behemoth", "Belias", "Brynhildr", "Cactuar", "Carbuncle", "Cerberus", "Chocobo", "Coeurl", "Diabolos", "Durandal", "Excalibur", "Exodus", "Faerie", "Famfrit", "Fenrir", "Garuda", "Gilgamesh", "Goblin", "Gungnir", "Hades", "Hyperion", "Ifrit", "Ixion", "Jenova", "Kujata", "Lamia", "Leviathan", "Lich", "Louisoix", "Malboro", "Mandragora", "Masamune", "Mateus", "Midgardsormr", "Moogle", "Odin", "Omega", "Pandaemonium", "Phoenix", "Ragnarok", "Ramuh", "Ridill", "Sargatanas", "Shinryu", "Shiva", "Siren", "Tiamat", "Titan", "Tonberry", "Typhon", "Ultima", "Ultros", "Unicorn", "Valefor", "Yojimbo", "Zalera", "Zeromus", "Zodiark", "Spriggan", "Twintania", "Bismarck", "Ravana", "Sephirot", "Sophia", "Zurvan", "Halicarnassus", "Maduin", "Marilith", "Seraph", "Alpha", "Phantom", "Raiden", "Sagittarius"]

connection.connect();
client.login(process.env.app_token);

//slash commands for setup
client.on('ready', async () => {
  //if (!client.application?.commands.cache) {
  var verifiedrole = new SlashCommandBuilder().setName('verifiedrole')
    .setDescription('Set the role to add for verification.')
    .addRoleOption(option =>
      option.setName('role')
        .setDescription('The verified role')
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

  var stickymessage = new SlashCommandBuilder().setName('stickymessage')
    .setDescription('Set up a message to stick to the bottom of a channel.')
    .addChannelOption(option =>
      option.setName('channel')
        .setDescription('The channel to set the sticky in')
        .setRequired(true))
    .addIntegerOption(option =>
      option.setName('speed')
        .setDescription('The number of messages to go by before the message refreshes, max 50')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('message')
        .setDescription('The message you\'d like to sticky')
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

  var unsticky = new SlashCommandBuilder().setName('unsticky')
    .setDescription('Remove sticky message functionality from a channel.')
    .addChannelOption(option =>
      option.setName('channel')
        .setDescription('The channel to remove sticky from')
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

  var hof = new SlashCommandBuilder().setName('hof')
    .setDescription('Set up Hall of Fame functionality.')
    .addStringOption(option =>
      option.setName('emoji_id')
        .setDescription('The numeric ID of the emoji')
        .setRequired(true))
    .addChannelOption(option =>
      option.setName('channel')
        .setDescription('The channel to set as the Hall of Fame')
        .setRequired(true))
    .addIntegerOption(option =>
      option.setName('threshold')
        .setDescription('The number of reactions necessary to add a post to the hall of fame.')
        .setRequired(true))
    .addBooleanOption(option =>
      option.setName('admin_override')
        .setDescription('If a react from a server administrator automatically adds a post to the hall of fame.')
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

  var event = new SlashCommandBuilder().setName('event')
    .setDescription('Set up an event.')
    .addStringOption(option =>
      option.setName('name')
        .setDescription('The name of the event.')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('description')
        .setDescription('A short description of the event.')
        .setRequired(true))
    .addChannelOption(option =>
      option.setName('channel')
        .setDescription('What channel the event should be published in.')
        .setRequired(true))
    .addBooleanOption(option =>
      option.setName('recurring')
        .setDescription('Whether this event should repeat on a day/days of week. If False, the "date" option must be set.')
        .setRequired(true))
    .addBooleanOption(option =>
      option.setName('mentionroles')
        .setDescription('Whether this event should mention roles.')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('starttime')
        .setDescription('The start time, formatted as 12-hour clock. e.g., "9:00 PM". US Eastern time.')
        .setRequired(true))
    .addIntegerOption(option =>
      option.setName('duration')
        .setDescription('The duration, in minutes, of the event. Cannot be more than 12 hours, or 720 minutes.')
        .setRequired(true))
    .addIntegerOption(option =>
      option.setName('rsvptime')
        .setDescription('The number of minutes before the event that the RSVP message should be posted.')
        .setRequired(true))
    .addIntegerOption(option =>
      option.setName('remindertime')
        .setDescription('The number of minutes before the event that users should be reminded, or blank for no reminder.'))
    .addStringOption(option =>
      option.setName('date')
        .setDescription('The date on which the non-recurring event should occur. Please enter as YYYY-MM-DD, e.g. 2023-01-30.'))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

  var deleteevent = new SlashCommandBuilder().setName('deleteevent')
    .setDescription('Delete an event.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);


  await client.application.commands.set([verifiedrole.toJSON(), stickymessage.toJSON(), unsticky.toJSON(), hof.toJSON(), event.toJSON(), deleteevent.toJSON()]);
  stickymessages = await connection.promise().query('select * from stickymessages');// Get sticky messages from database and cache them in an array.
});

client.on('interactionCreate', async (interaction) => {
  if (interaction.isCommand()) {
    if (interaction.commandName === 'verifiedrole') {
      var verifiedrole = interaction.options.getRole('role');
      var roleexists = await connection.promise().query('select * from servers_roles where guildid = ?', [interaction.guild.id]);
      if (roleexists[0].length > 0) {
        await connection.promise().query('update servers_roles set roleid = ? where guildid = ?', [verifiedrole.id, interaction.guild.id]);
      } else {
        await connection.promise().query('insert into servers_roles (guildid, roleid) values (?, ?)', [interaction.guild.id, verifiedrole.id]);
      }
      interaction.reply({ content: 'Successfully set the \'verified\' role!', ephemeral: true });
    } else if (interaction.commandName === 'stickymessage') {
      var exists = await connection.promise().query('select * from stickymessages where channel_id = ?', [interaction.options.getChannel('channel').id]);
      if (interaction.options.getInteger('speed') <= 50) {
        if (interaction.options.getString('message')) {
          var sentMessage = await interaction.options.getChannel('channel').send({ content: interaction.options.getString('message') });
        }
        if (exists[0].length > 0) {
          if (interaction.options.getString('message')) {
            await connection.promise().query('update stickymessages set message = ?, speed = ?, last_message_id = ? where channel_id = ?', [interaction.options.getString('message'), interaction.options.getInteger('speed'), sentMessage.id, interaction.options.getChannel('channel').id]);
          }
        } else {
          await connection.promise().query('insert into stickymessages (message, speed, last_message_id, channel_id) values (?, ?, ?, ?)', [interaction.options.getString('message'), interaction.options.getInteger('speed'), sentMessage.id, interaction.options.getChannel('channel').id]);
        }
        stickymessages = await connection.promise().query('select * from stickymessages'); // Refresh the live cache
        interaction.reply({ content: 'Sticky set!', ephemeral: true });
      } else {
        interaction.reply({ content: 'Speed can\'t be greater than 50. Sorry!', ephemeral: true });
      }
    } else if (interaction.commandName === 'unsticky') {
      var exists = await connection.promise().query('select * from stickymessages where channel_id = ?', [interaction.options.getChannel('channel').id]);
      if (exists[0].length > 0) {
        var channel = interaction.options.getChannel('channel')
        await channel.messages.fetch(exists[0][0].last_message_id).then(message => message.delete()).catch((error) => { console.error(error) });
        await connection.promise().query('delete from stickymessages where channel_id = ?', [channel.id]);
        await interaction.reply({ content: 'Unstickied!', ephemeral: true });
        stickymessages = await connection.promise().query('select * from stickymessages'); // Refresh the live cache - we could just remove the array element in future
      } else {
        await interaction.reply({ content: 'No sticky set in this channel.', ephemeral: true });
      }
    } else if (interaction.commandName === 'hof') {
      var channel = interaction.options.getChannel('channel');
      var emoji_id = interaction.options.getString('emoji_id');
      var threshold = interaction.options.getInteger('threshold');
      var admin_override = interaction.options.getBoolean('admin_override');
      var isHof = await connection.promise().query('select * from hof where guild_id = ?', interaction.guild.id);
      var queryData = [channel.id, emoji_id, threshold, admin_override, interaction.guild.id];
      if (isHof[0].length > 0) {
        await connection.promise().query('update hof set channel = ?, emoji_id = ?, threshold = ?, admin_override = ? where guild_id = ?', queryData);
      } else {
        await connection.promise().query('insert into hof (channel, emoji_id, threshold, admin_override, guild_id) values (?, ?, ?, ?, ?)', queryData);
      }
      await interaction.reply({ content: 'Hall of Fame successfully set!', ephemeral: true });
    } else if (interaction.commandName === 'event') {
      var name = interaction.options.getString('name');
      var description = interaction.options.getString('description');
      var channel = interaction.options.getChannel('channel');
      var recurring = interaction.options.getBoolean('recurring');
      var mentionroles = interaction.options.getBoolean('mentionroles');
      var starttime = interaction.options.getString('starttime');
      var duration = interaction.options.getInteger('duration');
      var rsvptime = interaction.options.getInteger('rsvptime');
      if (interaction.options.getString('date')) {
        var date = interaction.options.getString('date');
      }
      if (interaction.options.getInteger('remindertime')) {
        var remindertime = interaction.options.getInteger('remindertime');
      }
      if (duration <= 720 || (!recurring && !date)) {
        if (remindertime) {
          var event = await connection.promise().query('insert into events (name, description, channel_id, server_id, user_id, starttime, duration, rsvptime, remindertime) values (?, ?, ?, ?, ?, ?, ?, ?, ?)', [name, description, channel.id, interaction.guildId, interaction.user.id, starttime, duration, rsvptime, remindertime]);
        } else {
          var event = await connection.promise().query('insert into events (name, description, channel_id, server_id, user_id, starttime, duration, rsvptime) values (?, ?, ?, ?, ?, ?, ?, ?)', [name, description, channel.id, interaction.guildId, interaction.user.id, starttime, duration, rsvptime]);
        }
        if (recurring) {
          var weeklyKeyValues = [
            { label: 'Sunday', value: '0' },
            { label: 'Monday', value: '1' },
            { label: 'Tuesday', value: '2' },
            { label: 'Wednesday', value: '3' },
            { label: 'Thursday', value: '4' },
            { label: 'Friday', value: '5' },
            { label: 'Saturday', value: '6' }
          ]
          const weeklySelectComponent = new StringSelectMenuBuilder().setOptions(weeklyKeyValues).setCustomId('WeeklyRecurrenceMultiselector').setMinValues(1).setMaxValues(7);
          var weeklySelectRow = new ActionRowBuilder().addComponents(weeklySelectComponent);
          var message = await interaction.reply({ content: 'Next, please provide the days of the week the event recurs on.', components: [weeklySelectRow], ephemeral: true });
          var weekrecurrence = [];
        } else if (mentionroles) {
          const roleSelectComponent = new RoleSelectMenuBuilder().setCustomId('RoleMentionMultiselector').setMinValues(1).setMaxValues(5);
          var roleSelectRow = new ActionRowBuilder().addComponents(roleSelectComponent);
          var message = await interaction.reply({ content: 'Next, please provide the roles to mention when the event RSVP goes up.', components: [roleSelectRow], ephemeral: true });
        } else {
          await connection.promise().query('insert into events_onetimedates (event_id, date) values (?, ?)', [event[0].insertId, date]);
          await interaction.reply({ content: 'Event added!', ephemeral: true });
        }
      } // else duration must be less than twelve hours
      if (!mentionroles || recurring) {
        var collector = message.createMessageComponentCollector({ time: 120000 });
        collector.on('collect', async (interaction_second) => {
          if (interaction_second.customId == 'WeeklyRecurrenceMultiselector') {
            for (const dow of interaction_second.values) {
              await connection.promise().query('insert into events_weeklyrecurrences (event_id, dayofweek) values (?, ?)', [event[0].insertId, dow]);
            }
            if (mentionroles) {
              const roleSelectComponent = new RoleSelectMenuBuilder().setCustomId('RoleMentionMultiselector').setMinValues(1).setMaxValues(5);
              var roleSelectRow = new ActionRowBuilder().addComponents(roleSelectComponent);
              await interaction_second.update({ content: 'Next, please provide the roles to mention when the event RSVP goes up.', components: [roleSelectRow] });
            } else {
              interaction_second.update({ content: 'Event added!', components: [] });
            }
          } else if (interaction_second.customId == 'RoleMentionMultiselector') {
            for (const role of interaction_second.values) {
              console.log(role);
              await connection.promise().query('insert into events_rolementions (event_id, role_id) values (?, ?)', [event[0].insertId, role]);
            }
            if (!recurring) {
              await connection.promise().query('insert into events_onetimedates (event_id, onetimedate) values (?, ?)', [event[0].insertId, date]);
            }
            interaction_second.update({ content: 'Event added!', components: [] });
          }
        });
      }
    } else if (interaction.commandName == 'deleteevent') {
      var events = await connection.promise().query('select e.*, otd.date from events e left outer join events_onetimedates otd on e.id = otd.event_id where e.server_id = ?', [interaction.guildId]);
      var eventsKeyValues = [];
      if (events[0].length > 0) {
        for (const event of events[0]) {
          var thisEventChannel = await client.channels.cache.get(event.channel_id);
          if (event.date) {
            eventsKeyValues.push({ label: `${event.name} (in ${thisEventChannel.name}, on ${event.date})`, value: event.id.toString() });
          } else {
            eventsKeyValues.push({ label: `${event.name} (in ${thisEventChannel.name}, recurring)`, value: event.id.toString() });
          }
        }
        const eventSelectComponent = new StringSelectMenuBuilder().setOptions(eventsKeyValues).setCustomId('EventMentionSelector').setMinValues(1).setMaxValues(1);
        var eventSelectRow = new ActionRowBuilder().addComponents(eventSelectComponent);
        var message = await interaction.reply({ content: 'Please select the event to delete.', components: [eventSelectRow], ephemeral: true });
        var collector = message.createMessageComponentCollector({ time: 120000 });
        collector.on('collect', async (interaction_second) => {
          if (interaction_second.customId == 'EventMentionSelector') {
            await connection.promise().query('delete from events where id = ?', [interaction_second.values[0]]);
            interaction.second.update({ content: 'Event deleted.', components: [] });
          }
        });
      } else {
        interaction.reply({ content: 'I can\'t find any events in this server...', ephemeral: true });
      }
    }

  } else if (interaction.isButton()) {
    var buttonMessage = interaction.message;
    if (buttonMessage.partial) {
      await buttonMessage.fetch();
    }
    if (interaction.customId == 'buttonAccept' || interaction.customId == 'buttonTentative' || interaction.customId == 'buttonDecline') {
      if (interaction.customId == 'buttonAccept') {
        var newStatus = 'Accepted';
      } else if (interaction.customId == 'buttonTentative') {
        var newStatus = 'Tentative';
      } else {
        var newStatus = 'Declined';
      }
      // Get the event details, using buttonMessage.id == events_messages_info.rsvp_id.
      console.log(buttonMessage.id);
      console.log(interaction.user.id);
      var event = await connection.promise().query('select e.*, r.status, mi.id as message_info_id from events e join events_messages_info mi on e.id = mi.event_id left outer join events_responses r on mi.id = r.message_info_id and r.user_id = ? where mi.rsvp_id = ?', [interaction.user.id, buttonMessage.id]);
      // Get event responses where user_id = interaction.user.id.

      var thisEvent = event[0][0];
      console.log(thisEvent);
      var today = new Date();
      var ymd = today.toLocaleString("default", { year: "numeric" }) + '-' + today.toLocaleString("default", { month: "2-digit" }) + '-' + today.toLocaleString("default", { day: "2-digit" });
      var earlystarttime = new Date(ymd + ' ' + thisEvent.starttime);
      var starttime = new Date(earlystarttime.getTime()).setMinutes(earlystarttime.getMinutes());
      var endtime = new Date(earlystarttime.getTime()).setMinutes(earlystarttime.getMinutes() + thisEvent.duration); // Return unix millis
      var unixstarttime = Math.floor(starttime / 1000);
      var unixendtime = Math.floor(endtime / 1000);
      if (thisEvent.status) {
        if (newStatus == thisEvent.status) {
          console.log('delete');
          await connection.promise().query('delete from events_responses where user_id = ? and event_id = ? and message_info_id = ?', [interaction.user.id, thisEvent.id, thisEvent.message_info_id]);
        } else {
          console.log('update');
          await connection.promise().query('update events_responses set status = ? where user_id = ? and event_id = ? and message_info_id = ?', [newStatus, interaction.user.id, thisEvent.id, thisEvent.message_info_id]);
        }
      } else {
        console.log('insert');
        await connection.promise().query('insert into events_responses (user_id, event_id, status, message_info_id) values (?, ?, ?, ?)', [interaction.user.id, thisEvent.id, newStatus, thisEvent.message_info_id]);
      }
      var eventResponses = await connection.promise().query('select * from events_responses where event_id = ? and message_info_id = ?', [thisEvent.id, thisEvent.message_info_id]);
      var accepted = '';
      var tentative = '';
      var declined = '';
      for (const thisResponse of eventResponses[0]) {
        console.log(thisResponse);
        var member = await interaction.guild.members.fetch(thisResponse.user_id);
        console.log(member);
        var nickname = member.nickname;
        if (!nickname) {
          var nickname = member.user.username;
        }
        if (thisResponse.status == 'Accepted') {
          accepted += nickname + '\n';
        } else if (thisResponse.status == 'Tentative') {
          tentative += nickname + '\n';
        } else {
          declined += nickname + '\n';
        }
      }
      if (accepted == '') {
        accepted = '*(none)*';
      }
      if (tentative == '') {
        tentative = '*(none)*';
      }
      if (declined == '') {
        declined = '*(none)*';
      }

      const embeddedMessage = new EmbedBuilder()
        .setColor(0x770000)
        .setTitle(thisEvent.name)
        .setDescription(thisEvent.description)
        .addFields(
          { name: 'Time', value: '<t:' + unixstarttime + ':D> <t:' + unixstarttime + ':t> - <t:' + unixendtime + ':t>' },
          { name: 'Accepted', value: accepted, inline: true },
          { name: 'Tentative', value: tentative, inline: true },
          { name: 'Declined', value: declined, inline: true },
        );
      await interaction.message.edit({ embeds: [embeddedMessage] });
      await interaction.reply({ content: 'Your RSVP was recorded!', ephemeral: true });
    } else if (interaction.customId == 'buttonDelete') {
      // If interaction.user is administrator or their id matches the event author, delete.
    }
  }
});

client.on('messageCreate', async function (message) {
  try {
    await message.fetch();
    if (message.content.startsWith('!rm ')) {
      if (message.guild.ownerId != message.author.id) {
        var lookup_string = message.content.substr(message.content.indexOf(' ') + 1);
        var server = lookup_string.substr(0, lookup_string.indexOf(' '));
        var first_and_last_name = lookup_string.substr(lookup_string.indexOf(' ') + 1);
        var first_name = first_and_last_name.substr(0, first_and_last_name.indexOf(' '));
        var last_name = first_and_last_name.substr(first_and_last_name.indexOf(' ') + 1);
        first_name = first_name.charAt(0).toUpperCase() + first_name.slice(1).toLowerCase();
        last_name = last_name.charAt(0).toUpperCase() + last_name.slice(1).toLowerCase();
        server = server.charAt(0).toUpperCase() + server.slice(1).toLowerCase();

        if (first_name.length > 0 && last_name.length > 0 && server.length > 0) {
          if (servers.includes(server)) {
            var existing_verify = await connection.promise().query('select * from successful_verifications where name = ? and server = ?', [first_name + ' ' + last_name, server]);
            if (!(existing_verify[0].length > 0 && existing_verify[0][0].userid != message.user.id)) {
              var response = await fetch('https://xivapi.com/character/search?name=' + first_name + '%20' + last_name + '&server=' + server + '&private_key=' + xivapi_private_key);
              const result = await response.json();
              if (result.Results.length > 0) {
                var character_id = result.Results[0].ID;
                response = await fetch('https://xivapi.com/character/' + character_id + '?extended=1&private_key=' + xivapi_private_key);
                api_character = await response.json();
                await message.member.setNickname(first_name + ' ' + last_name);
                var server_role = await message.member.guild.roles.cache.find(role => role.name === server);
                var roles_string = '';
                if (server_role) {
                  await message.member.roles.add(server_role);
                  var roles_string = server_role.toString() + ','
                }
                verifiedrole = await connection.promise().query('select * from servers_roles where guildid = ?', [message.member.guild.id]);
                var verified_role = await message.member.guild.roles.cache.get(verifiedrole[0][0].roleid);
                await message.member.roles.add(verified_role);
                roles_string += verified_role.toString();
                //TODO: add character ID URL to the database, tied to the MEMBER ID, for a !rmwhoami in this server.
                await connection.promise().query('delete from member_registrations where member_id = ?; insert into member_registrations (member_id, lodestone_id, guild_id) values (?, ?, ?)', [message.member.id, message.member.id, character_id, message.member.guild.id]);
                const embeddedMessage = new EmbedBuilder()
                  .setColor(0xFFD700)
                  .setAuthor({ name: first_name + ' ' + last_name + ' @ ' + server, url: 'https://na.finalfantasyxiv.com/lodestone/character/' + character_id })
                  .setThumbnail(api_character.Character.Portrait)
                  .setDescription('Character saved.\n\nIn four hours, you may claim your character using Lodestone verification via the `!rmverify` command, should you wish to.')
                  .addFields(
                    { name: 'Nickname', value: 'Your Discord nickname was changed to **' + first_name + ' ' + last_name + '**.' },
                    { name: 'Roles Added', value: roles_string }
                  )
                  .setTimestamp()
                  .setFooter({ text: 'Welcome to Red Moon!' });
                message.reply({ embeds: [embeddedMessage] });
              } else {
                message.reply('I couldn\'t find this character on the Lodestone. Please try again, and ensure you entered your character name and server correctly.');
              }
            } else {
              message.reply('You\'ve attempted to register a character that another Discord account has already registered. Please try again, or contact Emma if this is your new discord account.');
            }
          } else {
            message.reply({ content: 'I couldn\'t detect a valid server to search your character on. Please make sure you\'ve entered a real server and then try again.', ephemeral: true });
          }
        } else {
          message.reply({ content: 'I couldn\'t detect a first name, last name, *and* server. Please make sure you\'ve entered all of these and then try again.', ephemeral: true });
        }
      } else {
        message.reply('Sorry, you\'re a server owner. I can\'t set anything for the owner.');
      }

    } else if (message.content.startsWith('!rmverify')) {
      var verification_string = crypto.randomBytes(16).toString("hex");
      var existing_code = await connection.promise().query('select * from verification_codes where userid = ' + message.author.id);
      if (existing_code[0].length == 0) {
        await connection.promise().query('insert into verification_codes (userid, fname, lname, server, code) values (?, ?, ?, ?, ?)', [message.author.id, first_name, last_name, server, verification_string]);
        message.author.send('Please enter the following code into the Character Profile section of your Lodestone page: `' + verification_string + '`. ONLY when you\'re done with this step, please type `!rmcomplete` in the server verification channel to verify yourself.');
      } else {
        message.reply({ content: 'You\'ve already got an active verification session under ' + existing_code[0][0].fname + ' ' + existing_code[0][0].lname + ' @ ' + existing_code[0][0].server + '. Please finish that session by using `!rmcomplete` or `!rmcancel` before starting a new verification session.', ephemeral: true });
      }
    } else if (message.content.startsWith('!rmcomplete')) {
      var userid = message.author.id;
      var bio = '';
      var character = await connection.promise().query('select * from verification_codes where userid = ?', [userid]);
      if (character[0].length > 0) {
        var response = await fetch('https://xivapi.com/character/search?name=' + character[0][0].fname + '%20' + character[0][0].lname + '&server=' + character[0][0].server + '&private_key=' + xivapi_private_key);
        const result = await response.json();
        var character_id = result.Results[0].ID;
        if (character_id) {
          response = await fetch('https://xivapi.com/character/' + character_id + '?extended=1&private_key=' + xivapi_private_key);
          api_character = await response.json();
          console.log(api_character);
          bio = api_character.Character.Bio;
          if (bio.includes(character[0][0].code)) {
            await connection.promise().query('insert into successful_verifications (name, server, member) values (?, ?, ?)', [character[0][0].fname + ' ' + character[0][0].lname, character[0][0].server, message.author.id]);
            await connection.promise().query('delete from verification_codes where userid = ?', [userid]);
            message.reply({ content: 'Successfully verified!', ephemeral: true });
          } else {
            message.author.send('I couldn\'t verify your character. Please make sure you entered the verification string (`' + character[0][0].code + '`) correctly and try again. Or, use `!rmcancel` to start over. You may have to wait up to 4 hours due to Lodestone limitations.');
          }
        } else {
          message.author.send({ content: 'I couldn\'t find a character by the name you entered. Please use `!rmcancel` and start over.' });
        }
      } else {
        message.author.send({ content: 'You don\'t seem to have a pending verification. Start by typing `!rmverify`.' });
      }
    } else if (message.content.startsWith('!rmcancel')) {
      await connection.promise().query('delete from verification_codes where userid = ?', [message.author.id]);
      message.author.send({ content: 'I cancelled your pending verification. You can start a new one by using `!rmverify`.' });
    }


    //Process stickies AFTER all message stuff. TODO: Cron this.
    if (stickymessages[0]) {
      var isStickyChannel = stickymessages[0].find(e => e.channel_id === message.channel.id);
      if (isStickyChannel) {
        var messageCount = await message.channel.messages.fetch({ after: isStickyChannel.last_message_id });
        console.log(messageCount.size);
        if (messageCount.size >= isStickyChannel.speed) {
          await message.channel.messages.fetch(isStickyChannel.last_message_id).then(async (message) => {
            message.delete();
            var sentMessage = await message.channel.send({ content: isStickyChannel.message }); // Post sticky message
            await connection.promise().query('update stickymessages set last_message_id = ? where channel_id = ?', [sentMessage.id, isStickyChannel.channel_id]);
            stickymessages = await connection.promise().query('select * from stickymessages'); // Refresh the live cache
          }).catch((error) => { console.error(error) }); // TODO check if message exists


        }
      }
    } else {
      stickymessages = await connection.promise().query('select * from stickymessages');
    }
  } catch (e) {
    console.error(e);
  }
});

client.on('messageReactionAdd', async function (reaction, user) {
  try {
    if (reaction.partial) {
      await reaction.fetch();
    }
    //todo cache reactions
    var message = await reaction.message.fetch();
    var hofData = await connection.promise().query('select * from hof where guild_id = ?', message.guildId);
    var member = await message.guild.members.cache.get(user.id);
    if (hofData[0].length > 0 && reaction.emoji.id == hofData[0][0].emoji_id && (reaction.count >= hofData[0][0].threshold || (hofData[0][0].admin_override == true && member.permissions.has(PermissionsBitField.Flags.Administrator)))) {
      var is_hof = await connection.promise().query('select * from hof_msg where message_id = ?', message.id);
      if (is_hof[0].length <= 0) {
        //create pin (message embed / rich formatting)
        const embeddedMessage = new EmbedBuilder()
          .setColor(0xFFD700)
          .setAuthor({ name: message.member.displayName });
        if (message.content.length > 0) {
          embeddedMessage.setDescription(message.content);
        }
        console.log(message);
        if (message.embeds && message.embeds[0] !== undefined && message.embeds[0].image) {
          embeddedMessage.setImage(message.embeds[0].image.url);
        }
        if (message.attachments && message.attachments.first() !== undefined && message.attachments.first().contentType.startsWith('image')) {
          console.log('has attachment');
          embeddedMessage.setImage(message.attachments.first().url);
        }
        embeddedMessage.setFields({ name: 'Source', value: '[click!](' + message.url + ')' })
          .setTimestamp();
        var channel = await client.channels.cache.get(hofData[0][0].channel);
        var hof_msg = await channel.send({ embeds: [embeddedMessage], content: reaction.count + ' ' + reaction.emoji.toString() + ' - ' + message.channel.toString() });
        await connection.promise().query('insert into hof_msg (message_id, hof_msg_id) values (?, ?)', [message.id, hof_msg.id]);
      } else {
        var channel = await client.channels.cache.get(hofData[0][0].channel);
        console.log(channel);
        await channel.messages.fetch(is_hof[0][0].hof_msg_id).then(hof_msg => hof_msg.edit({ content: reaction.count + ' ' + reaction.emoji.toString() + ' - ' + message.channel.toString() }));
      }

    }
  } catch (e) {
    console.error(e);
  }
});

setInterval(async function () {
  var today = new Date();
  var ymd = today.toLocaleString("default", { year: "numeric" }) + '-' + today.toLocaleString("default", { month: "2-digit" }) + '-' + today.toLocaleString("default", { day: "2-digit" })
  var events = await connection.promise().query('select e.*, mi.id as message_info_id, mi.rsvp_id, mi.reminder_id from events e left outer join events_weeklyrecurrences wr on e.id = wr.event_id left outer join events_onetimedates otd on e.id = otd.event_id left outer join events_messages_info mi on e.id = mi.event_id and mi.day = ? where (wr.dayofweek = ? or otd.date = ?) and ((e.remindertime is not null and mi.reminder_id is null) or mi.rsvp_id is null)', [ymd, today.getDay(), ymd]);
  console.log(events[0]);
  // Retrieve events from DB: include weeklyrecurrences where dayofweek == today.getDay(). include onetimedates. Join events_messages_info.
  for (const event of events[0]) {
    var earlystarttime = new Date(ymd + ' ' + event.starttime);
    var starttime = new Date(earlystarttime.getTime()).setMinutes(earlystarttime.getMinutes());
    var endtime = new Date(earlystarttime.getTime()).setMinutes(earlystarttime.getMinutes() + event.duration); // Return unix millis
    var rsvptime = new Date(earlystarttime.getTime()).setMinutes(earlystarttime.getMinutes() - event.rsvptime); // Return unix millis
    if (event.remindertime) {
      var remindertime = new Date(earlystarttime.getTime()).setMinutes(earlystarttime.getMinutes() - event.remindertime); // Return unix millis
    } else {
      var remindertime = false;
    }
    if (rsvptime < today.getTime() && !event.rsvp_id) {
      var channel = await client.channels.cache.get(event.channel_id);
      var guild = await client.guilds.cache.get(channel.guildId);
      // Create RSVP message with the buttons, pinging roles (retrieve).
      var roles = await connection.promise().query('select * from events_rolementions where event_id = ?', [event.id]);
      var messageContent = '';
      for (const role of roles[0]) {
        var roleMention = await guild.roles.fetch(role.role_id);
        console.log(roleMention);
        console.log(`${roleMention}`);
        messageContent += `${roleMention} `;
      }
      var unixstarttime = Math.floor(starttime / 1000);
      var unixendtime = Math.floor(endtime / 1000);
      const embeddedMessage = new EmbedBuilder()
        .setColor(0x770000)
        .setTitle(event.name)
        .setDescription(event.description)
        .addFields(
          { name: 'Time', value: '<t:' + unixstarttime + ':D> <t:' + unixstarttime + ':t> - <t:' + unixendtime + ':t>' },
          { name: 'Accepted', value: '*(none)*', inline: true },
          { name: 'Tentative', value: '*(none)*', inline: true },
          { name: 'Declined', value: '*(none)*', inline: true },
        );
      // Todo: Footer contains user name who created it.
      var accept = await client.emojis.cache.get('1076576999813959680');
      var decline = await client.emojis.cache.get('1076576737716080681');
      var tentative = await client.emojis.cache.get('1076577988839219220');
      var buttonAccept = new ButtonBuilder().setCustomId('buttonAccept').setEmoji(accept).setStyle('Secondary');
      var buttonTentative = new ButtonBuilder().setCustomId('buttonTentative').setEmoji(tentative).setStyle('Secondary');
      var buttonDecline = new ButtonBuilder().setCustomId('buttonDecline').setEmoji(decline).setStyle('Secondary');
      // var buttonDelete = new ButtonBuilder().setCustomId('buttonDelete').setEmoji('🗑️').setStyle('Secondary');
      const buttonRow = new ActionRowBuilder().addComponents(buttonAccept, buttonTentative, buttonDecline);
      var message = await channel.send({ content: messageContent, embeds: [embeddedMessage], components: [buttonRow] });
      await connection.promise().query('insert into events_messages_info (event_id, day, rsvp_id) values (?, ?, ?)', [event.id, ymd, message.id]);
    }
    if (remindertime && remindertime < today.getTime() && !event.reminder_id) {
      var channel = await client.channels.cache.get(event.channel_id);
      var messageContent = '';
      var mentions = await connection.promise().query('select * from events_responses where event_id = ? and status = ?', [event.id, 'Accepted']);
      for (const mention of mentions) {
        messageContent += '<@' + mention.user_id + '> ';
      }
      messageContent += 'The event: **' + event.name + '** will begin in ' + event.remindertime + ' minutes!';
      var message = await channel.send({ content: messageContent });

      await connection.promise().query('update events_messages_info set reminder_id = ? where id = ?', [message.id, event.message_info_id]);
    }
  }
  // TODO: Clean up old events.
}, 60000);