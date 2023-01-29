const Discord = require('discord.js');
const {EmbedBuilder, SlashCommandBuilder, GatewayIntentBits, Partials, PermissionsBitField, PermissionFlagsBits} = require('discord.js');
const client = new Discord.Client({intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages], partials: [Partials.Message, Partials.Channel, Partials.Reaction], });
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

var servers = ["Adamantoise","Aegis","Alexander","Anima","Asura","Atomos","Bahamut","Balmung","Behemoth","Belias","Brynhildr","Cactuar","Carbuncle","Cerberus","Chocobo","Coeurl","Diabolos","Durandal","Excalibur","Exodus","Faerie","Famfrit","Fenrir","Garuda","Gilgamesh","Goblin","Gungnir","Hades","Hyperion","Ifrit","Ixion","Jenova","Kujata","Lamia","Leviathan","Lich","Louisoix","Malboro","Mandragora","Masamune","Mateus","Midgardsormr","Moogle","Odin","Omega","Pandaemonium","Phoenix","Ragnarok","Ramuh","Ridill","Sargatanas","Shinryu","Shiva","Siren","Tiamat","Titan","Tonberry","Typhon","Ultima","Ultros","Unicorn","Valefor","Yojimbo","Zalera","Zeromus","Zodiark","Spriggan","Twintania","Bismarck","Ravana","Sephirot","Sophia","Zurvan","Halicarnassus","Maduin","Marilith","Seraph","Alpha","Phantom","Raiden","Sagittarius"]

connection.connect();
client.login(process.env.app_token);

//slash commands for setup
client.on('ready', async () => {
    //if (!client.application?.commands.cache) {
    var command = new SlashCommandBuilder().setName('verifiedrole')
      .setDescription('Set the role to add for verification.')
      .addRoleOption(option =>
        option.setName('role')
        .setDescription('The verified role')
        .setRequired(true))
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);
      
      console.log(command.toJSON());
    await client.application.commands.set([command.toJSON()]);
    //}
});

client.on('interactionCreate', async(interaction) => {
  if (interaction.isCommand()) {
    if (interaction.commandName === 'verifiedrole') {
      if (interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        var verifiedrole = interaction.options.getRole('role');
        var roleexists = await connection.promise().query('select * from servers_roles where guildid = ?', [interaction.guild.id]);
        if (roleexists[0].length > 0) {
          await connection.promise().query('update servers_roles set roleid = ? where guildid = ?', [verifiedrole.id, interaction.guild.id]);
        } else {
          await connection.promise().query('insert into servers_roles (guildid, roleid) values (?, ?)', [interaction.guild.id, verifiedrole.id]);
        }
        interaction.reply({content: 'Successfully set the \'verified\' role!', ephemeral: true});
      }
    }
  }
});

client.on('messageCreate', async function (message) {
await message.fetch();
if (message.content.startsWith('!rmiam')) {
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
            if(result.Results.length > 0) {
              var character_id = result.Results[0].ID;
              response = await fetch('https://xivapi.com/character/' + character_id + '?extended=1&private_key=' + xivapi_private_key);
              api_character = await response.json();
              await message.member.setNickname(first_name + ' ' + last_name);
              var server_role = await message.member.guild.roles.cache.find(role => role.name === server);
              var roles_string = '';
              if(server_role) {
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
                .setAuthor({name: first_name + ' ' + last_name + ' @ ' + server, url: 'https://na.finalfantasyxiv.com/lodestone/character/' + character_id})
                .setThumbnail(api_character.Character.Portrait)
                .setDescription('Character saved.\n\nIn four hours, you may claim your character using Lodestone verification via the `!rmverify` command, should you wish to.')
                .addFields(
                  {name: 'Nickname', value: 'Your Discord nickname was changed to **' + first_name + ' ' + last_name + '**.'},
                  {name: 'Roles Added', value: roles_string }
                )
                .setTimestamp()
                .setFooter({text: 'Welcome to Red Moon!'});
                message.reply({embeds: [embeddedMessage]});
            } else {
            message.reply('I couldn\'t find this character on the Lodestone. Please try again, and ensure you entered your character name and server correctly.');
            }
          } else {
            message.reply('You\'ve attempted to register a character that another Discord account has already registered. Please try again, or contact Emma if this is your new discord account.');
          }
      } else {
        message.reply({content: 'I couldn\'t detect a valid server to search your character on. Please make sure you\'ve entered a real server and then try again.', ephemeral: true});
      }
    } else {
      message.reply({content: 'I couldn\'t detect a first name, last name, *and* server. Please make sure you\'ve entered all of these and then try again.', ephemeral: true});
    }
  } else {
    message.reply('Sorry, you\'re a server owner. I can\'t set anything for the owner.');
  }
  
} else if(message.content.startsWith('!rmverify')) {
  var verification_string = crypto.randomBytes(16).toString("hex");
  var existing_code = await connection.promise().query('select * from verification_codes where userid = ' + message.author.id);
  if(existing_code[0].length == 0) {
    await connection.promise().query('insert into verification_codes (userid, fname, lname, server, code) values (?, ?, ?, ?, ?)', [message.author.id, first_name, last_name, server, verification_string]);
    message.author.send('Please enter the following code into the Character Profile section of your Lodestone page: `' + verification_string + '`. ONLY when you\'re done with this step, please type `!rmverify` in the server verification channel to verify yourself.');
  } else {
    message.reply({content: 'You\'ve already got an active verification session under ' + existing_code[0][0].fname + ' ' + existing_code[0][0].lname + ' @ ' + existing_code[0][0].server + '. Please finish that session by using `!rmverify` or `!rmcancel` before starting a new verification session.', ephemeral: true});
  }
} else if (message.content.startsWith('!rmcomplete')){
  var userid = message.author.id;
  var bio = '';
  var character = await connection.promise().query('select * from verification_codes where userid = ?', [userid]);
  if(character[0].length > 0){
    var response = await fetch('https://xivapi.com/character/search?name=' + character[0][0].fname + '%20' + character[0][0].lname + '&server=' + character[0][0].server + '&private_key=' + xivapi_private_key);
    const result = await response.json();
    var character_id = result.Results[0].ID;
    if(character_id) {
      response = await fetch('https://xivapi.com/character/' + character_id + '?extended=1&private_key=' + xivapi_private_key);
      api_character = await response.json();
      console.log(api_character);
      bio = api_character.Character.Bio;
      if (bio.includes(character[0][0].code)) {
        await connection.promise().query('insert into successful_verifications (name, server, member) values (?, ?, ?)', [character[0][0].fname + ' ' + character[0][0].lname, character[0][0].server, message.author.id]);
        await connection.promise().query('delete from verification_codes where userid = ?', [userid]);
        message.reply({content: 'Successfully verified!', ephemeral: true});
      } else {
        message.author.send('I couldn\'t verify your character. Please make sure you entered the verification string (`' + character[0][0].code + '`) correctly and try again. Or, use `!rmcancel` to start over. You may have to wait up to 4 hours due to Lodestone limitations.');
      }
    } else {
      message.reply({content: 'I couldn\'t find a character by the name you entered. Please use `!rmcancel` and start over.', ephemeral: true});
    }
  } else {
    message.reply({content: 'You don\'t seem to have a pending verification. Start with `!rmiam Firstname Lastname Server`.', ephemeral: true});
  }
} else if (message.content.startsWith('!rmcancel')) {
  await connection.promise().query('delete from verification_codes where userid = ?', [message.author.id]);
  message.reply({content: 'I cancelled your pending verification. You can start a new one by using `!rmiam Firstname Lastname Server`.', ephemeral: true});
}
});