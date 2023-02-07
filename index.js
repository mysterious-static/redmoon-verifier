const Discord = require('discord.js');
const { EmbedBuilder, SlashCommandBuilder, GatewayIntentBits, Partials, PermissionsBitField, PermissionFlagsBits } = require('discord.js');
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
        .setDescription('The number of messages to go by before the message refreshes')
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

  await client.application.commands.set([verifiedrole.toJSON(), stickymessage.toJSON(), unsticky.toJSON(), hof.toJSON()]);
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
      if (interaction.options.getString('message')) {
        // Post message
        var sentMessage = await interaction.options.getChannel('channel').send({ content: interaction.options.getString('message') });
        // Store message id
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
    } else if (interaction.commandName === 'unsticky') {
      var exists = await connection.promise().query('select * from stickymessages where channel_id = ?', [interaction.options.getChannel('channel').id]);
      if (exists[0].length > 0) {
        var channel = interaction.options.getChannel('channel')
        await channel.messages.fetch(exists[0][0].last_message_id).then(message => message.delete);
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
    }
  }
});

client.on('messageCreate', async function (message) {
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


  //Process stickies AFTER all message stuff.
  if (stickymessages[0]) {
    var isStickyChannel = stickymessages[0].find(e => e.channel_id === message.channel.id);
    if (isStickyChannel) {
      var messageCount = await message.channel.messages.fetch({ after: isStickyChannel.last_message_id });
      console.log(messageCount.size);
      if (messageCount.size >= isStickyChannel.speed) {
        await message.channel.messages.fetch(isStickyChannel.last_message_id).then(message => message.delete());
        var sentMessage = await message.channel.send({ content: isStickyChannel.message }); // Post sticky message
        await connection.promise().query('update stickymessages set last_message_id = ? where channel_id = ?', [sentMessage.id, isStickyChannel.channel_id]);
        stickymessages = await connection.promise().query('select * from stickymessages'); // Refresh the live cache
      }
    }
  } else {
    stickymessages = await connection.promise().query('select * from stickymessages');
  }
});

client.on('messageReactionAdd', async function (reaction, user) {
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
      hof_msg = await channel.messages.fetch(is_hof[0].hof_msg_id);
      console.log(hof_msg);
      hof_msg.edit({ content: reaction.count + ' ' + reaction.emoji.toString() + ' - ' + message.channel.toString() });
    }


  }
});