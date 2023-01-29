const Discord = require('discord.js');
const {GatewayIntentBits, Partials, PermissionsBitField, PermissionFlagsBits} = require('discord.js');
const client = new Discord.Client({intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages], partials: [Partials.Message, Partials.Channel, Partials.Reaction], });
var mysql = require('mysql2');
var fetch = import('node-fetch');
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

//slash commands for setup
client.on('ready', async () => {
    //if (!client.application?.commands.cache) {
    var data = new SlashCommandBuilder().setName('verifiedrole')
      .setDescription('Set the role to add for verification.')
      .addRoleOption(option =>
        option.setName('role')
        .setRequired(true))
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);
    console.log(data);
    //await client.application.commands.set(data);
    //}
});

client.on('interactionCreate', async(interaction) => {
  if (interaction.isCommand()) {
    if (interaction.commandName === 'verifiedrole') {
      if (interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        var verifiedrole = interaction.options.getRole('role');
        var roleexists = await connection.promise().query('select * from servers_roles where guildid = ?', [interaction.guild.id]);
        if (roleexists[0].length > 0) {
          await connection.promise().query('update servers_roles where guildid = ? set roleid = ?', [interaction.guild.id, role.id]);
        } else {
          await connection.promise().query('insert into servers_roles (guildid, roleid) values (?, ?)', [interaction.guild.id, role.id]);
        }
        message.reply({content: 'Successfully set the \'verified\' role!', ephemeral: true});
      }
    }
  }
});

client.on('message', async function (message) {
if (message.startsWith('!rmiam')) {
  // TODO check if verification role is set.
  var lookup_string = message.content.substr(message.content.indexOf(' ') + 1);
  var first_name = lookup_string.substr(0, lookup_string.indexOf(' '));
  var last_name_and_server = lookup_string.substr(lookup_string.indexOf(' ') + 1);
  var last_name = last_name_and_server.substr(0, last_name_and_server.indexOf(' '));
  var server = last_name_and_server.substr(last_name_and_server.indexOf(' ') + 1);
  first_name = first_name.charAt(0).toUpperCase() + first_name.slice(1).toLowerCase();
  last_name = last_name.charAt(0).toUpperCase() + last_name.slice(1).toLowerCase();
  server = server.charAt(0).toUpperCase() + server.slice(1).toLowerCase();
  
  if (first_name.length > 0 && last_name.length > 0 && server.length > 0) {
    if (servers.includes(server)) {
      var verification_string = crypto.randomBytes(16).toString("hex");
      var existing_code = await connection.promise().query('select * from verification_codes where userid = ' + message.member.id);
      if(existing_code[0].length == 0) {
        await connection.promise().query('insert into verification_codes (userid, fname, lname, server, code) values (?, ?, ?, ?, ?)', [message.member.id, first_name, last_name, server, verification_string]);
        message.reply({content: 'Please enter the following code into the Bio section of your Lodestone page: `' + verification_string + '`. When you\'re done, please come back here and type `!rmverify` to verify yourself.', ephemeral: true});
      } else {
        message.reply({content: 'You\'ve already got an active verification session under ' + existing_code[0][0].fname + ' ' + existing_code[0][0].lname + ' @ ' + existing_code[0][0].server + '. Please finish that session by using `!rmverify` or `!rmcancel` before starting a new verification session.', ephemeral: true});
      }
    } else {
      message.reply({content: 'I couldn\'t detect a valid server to search your character on. Please make sure you\'ve entered a real server and then try again.', ephemeral: true});
    }
  } else {
    message.reply({content: 'I couldn\'t detect a first name, last name, *and* server. Please make sure you\'ve entered all of these and then try again.', ephemeral: true});
  }
  
} else if(message.startsWith('!rmverify')) {
  var userid = message.member.id;
  var bio = '';
  var character = await connection.promise().query('select * from verification_codes where userid = ?', [userid]);
  if(character[0].length > 0){
    var response = await fetch('https://xivapi.com/character/search?name=' + character[0][0].fname + '%20' + character[0][0].lname + '&server=' + character[0][0].server + '&private_key=' + xivapi_private_key);
    const result = await response.json();
    var character_id = result.Results[0].ID;
    response = await fetch('https://xivapi.com/character/' + character_id + '?extended=1&private_key=' + xivapi_private_key);
    character = await response.json();
    bio = character.Bio;
    if (bio.includes(character[0][0].code)) {
      message.member.setNickname(character[0][0].fname + ' ' + character[0][0].lname);
      var server_role = await member.guild.roles.cache.find(role => role.name === character[0][0].server);
      if(server_role) {
        await message.member.roles.add(server_role);
      }
      verifiedrole = connection.promise().query('select * from servers_roles where guildid = ?', [message.member.guild.id]);
      var verified_role = await member.guild.roles.cache.get(verifiedrole[0][0].roleid);
      await message.member.roles.add(verified_role);
      await connection.promise().query('insert into successful_verifications (name, server, member) values (?, ?, ?)', [character[0][0].fname + ' ' + character[0][0].lname, character[0][0].server, message.member.id]);
      await connection.promise().query('delete from verification_codes where userid = ?', [userid]);
      message.reply({content: 'Successfully verified!', ephemeral: true});
    } else {
      message.reply({content: 'I couldn\'t verify your character. Please make sure you entered the verification string (' + verifyString + ') correctly and try again. Or, use `!rmcancel` to start over.', ephemeral: true} );
    }
  } else {
    message.reply({content: 'You don\'t seem to have a pending verification. Start with `!rmiam Firstname Lastname Server`.', ephemeral: true});
  }
} else if (message.startsWith('!rmcancel')) {
  await connection.promise().query('delete from verification_codes where userid = ?', [message.member.id]);
  message.reply({content: 'I cancelled your pending verification. You can start a new one by using `!rmiam Firstname Lastname Server`.', ephemeral: true});
}
});