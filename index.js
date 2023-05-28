const Discord = require('discord.js');
const { EmbedBuilder, SlashCommandBuilder, GatewayIntentBits, Partials, PermissionsBitField, PermissionFlagsBits, StringSelectMenuBuilder, RoleSelectMenuBuilder, ActionRowBuilder, ButtonBuilder } = require('discord.js');
const client = new Discord.Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildMessageReactions], partials: [Partials.Message, Partials.Channel, Partials.Reaction], });
var mysql = require('mysql2');
var fetch = require('node-fetch');
var crypto = require('node:crypto');
var zxcvbn = require('zxcvbn');
var fs = require('fs').promises;
const { S3Client, PutBucketWebsiteCommand, PutPublicAccessBlockCommand, PutBucketPolicyCommand, PutObjectCommand, CreateBucketCommand } = require('@aws-sdk/client-s3');
const { CloudFrontClient, CreateDistributionCommand, CreateInvalidationCommand, GetDistributionCommand, UpdateDistributionCommand } = require('@aws-sdk/client-cloudfront');
const { fromIni } = require("@aws-sdk/credential-providers");

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
var activeStickyDeletions = [];

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
        .setDescription('The message you\'d like to sticky. For new lines, use "\\n".')
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

  var birthday = new SlashCommandBuilder().setName('birthday')
    .setDescription('Set a birthday for a user.')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The user whose birthday you\'re setting.')
        .setRequired(true))
    .addIntegerOption(option =>
      option.setName('month')
        .setDescription('The month of the user\'s birthday.')
        .setRequired(true))
    .addIntegerOption(option =>
      option.setName('day')
        .setDescription('The day of the user\'s birthday.')
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);
  //Append current year, make it a datetime so we can query later with month(date) = ? and day(date) = ?
  //On the daily cron, check to see if the user is still in the server before posting.
  var removebirthday = new SlashCommandBuilder().setName('removebirthday')
    .setDescription('Remove a user\'s birthday.')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The user whose birthday you wish to remove.')
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

  var birthdaychannel = new SlashCommandBuilder().setName('birthdaychannel')
    .setDescription('Set a channel to announce monthly and daily birthdays in.')
    .addChannelOption(option =>
      option.setName('channel')
        .setDescription('The channel where you\'d like birthdays to be posted.')
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Adminstrator);

  //Monthly cron to post This Month's Birthdays.

  var deleteevent = new SlashCommandBuilder().setName('deleteevent')
    .setDescription('Delete an event.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

  var serveropenchannel = new SlashCommandBuilder().setName('serveropenchannel')
    .setDescription('Set the channel to notify when Jenova is open for transfers.')
    .addChannelOption(option =>
      option.setName('channel')
        .setDescription('The channel to notify when Jenova opens for transfers.')
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);
  var serveropenroles = new SlashCommandBuilder().setName('serveropenroles')
    .setDescription('Set the roles to notify when Jenova is open for transfers.');

  var namechangechannel = new SlashCommandBuilder().setName('namechangechannel')
    .setDescription('Set the channel to notify when users change their character name.')
    .addChannelOption(option =>
      option.setName('channel')
        .setDescription('The channel to notify when a user changes their character name.')
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

  var minutes = new SlashCommandBuilder().setName('minutes')
    .setDescription('Display the time in minutes until your entered time.')
    .addStringOption(option =>
      option.setName('time')
        .setDescription('The time you\'d like to get minutes until, for example 12:45 am')
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

  var kinklist = new SlashCommandBuilder().setName('kinklist')
    .setDescription('Create a court kinklist under your name.')
    .addAttachmentOption(option =>
      option.setName('image')
        .setDescription('Your kinksheet image (as PNG).')
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

  var customkinklistname = new SlashCommandBuilder().setName('customkinklistname')
    .setDescription('Use a custom subdomain (not your name) for your kinklist.')
    .addStringOption(option =>
      option.setName('name')
        .setDescription('Custom name. Maximum 25 characters')
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

  var menu = new SlashCommandBuilder().setName('menu')
  .setDescription('Upload a new menu image.')
  .addAttachmentOption(option =>
    option.setName('image')
    .setDescription('New mneu image')
    .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)

  // need to add kinklist and customkinklistname to available commands
  await client.application.commands.set([verifiedrole.toJSON(), stickymessage.toJSON(), unsticky.toJSON(), hof.toJSON(), event.toJSON(), deleteevent.toJSON(), birthday.toJSON(), birthdaychannel.toJSON(), removebirthday.toJSON(), serveropenchannel.toJSON(), serveropenroles.toJSON(), namechangechannel.toJSON(), minutes.toJSON(), kinklist.toJSON(), customkinklistname.toJSON(), menu.toJSON()]);
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
    } else if (interaction.commandName === 'menu') {
      interaction.deferReply({ ephemeral: true });
      const s3 = new S3Client({ credentials: fromIni({ profile: "redmoon" }) });
      var file = await fetch(interaction.options.getAttachment('image').url);
      var blob = await file.arrayBuffer();
      var params = {
        Body: blob,
        Bucket: "menu.rmxiv.com",
        Key: "menu.png",
        ContentType: "image/png"
      };
      command = new PutObjectCommand(params);
      await s3.send(command);
      params = {
        DistributionId: 'E3PF1FS1HWQKU1',
        InvalidationBatch: {
          Paths: {
            Quantity: 1,
            Items: [
              '/*'
            ]
          },
          CallerReference: new Date().valueOf()
        },
      }
      var cf = new CloudFrontClient({ credentials: fromIni({ profile: "redmoon" }) });
      command = new CreateInvalidationCommand(params);
      await cf.send(command);

      interaction.editReply('Kinklist image updated! This will be live for you within the next 30 minutes.');
    } else if (interaction.commandName === 'kinklist') {
      interaction.deferReply({ ephemeral: true });
      const s3 = new S3Client({ credentials: fromIni({ profile: "redmoon" }) });
      var kinklist = await connection.promise().query('select * from kinklists where userid = ? and guildid = ?', [interaction.member.id, interaction.guild.id]);
      if (kinklist[0].length > 0 && kinklist[0][0].s3) {
        var file = await fetch(interaction.options.getAttachment('image').url);
        var blob = await file.arrayBuffer();
        var params = {
          Body: blob,
          Bucket: kinklist[0][0].s3,
          Key: "index.png",
          ContentType: "image/png"
        };
        command = new PutObjectCommand(params);
        await s3.send(command);
        console.log(new Date().valueOf());
        params = {
          DistributionId: kinklist[0][0].cf_id,
          InvalidationBatch: {
            Paths: {
              Quantity: 1,
              Items: [
                '/index.png'
              ]
            },
            CallerReference: new Date().valueOf()
          },
        }
        var cf = new CloudFrontClient({ credentials: fromIni({ profile: "redmoon" }) });
        command = new CreateInvalidationCommand(params);
        await cf.send(command);

        interaction.editReply('Kinklist image updated! This will be live for you within the next 30 minutes.');
      } else {
        if (kinklist[0].length > 0 && kinklist[0][0].subdomain) {
          var bucketname = kinklist[0][0].subdomain;
        } else {
          var bucketname = interaction.member.displayName.toLowerCase().replace(/\s+/g, '');
        }
        var params = {
          Bucket: bucketname + ".rmxiv.com",
        };
        var command = new CreateBucketCommand(params);
        var res = await s3.send(command);
        var bucket = res.Location.replace(/^\/+/, '');
        await connection.promise().query('replace into kinklists (userid, guildid, s3, subdomain) values (?, ?, ?, ?)', [interaction.member.id, interaction.guild.id, bucket, bucketname]);
        var webparams = {
          Bucket: bucket,
          WebsiteConfiguration: {
            ErrorDocument: {
              Key: 'index.png'
            },
            IndexDocument: {
              Suffix: 'index.png'
            }
          }
        }
        command = new PutBucketWebsiteCommand(webparams);
        await s3.send(command);
        params = {
          Bucket: bucket,
          PublicAccessBlockConfiguration: {
            BlockPublicPolicy: false
          }
        }
        command = new PutPublicAccessBlockCommand(params);
        await s3.send(command);
        params = {
          Bucket: bucket,
          Policy: `{
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Sid": "PublicReadGetObject",
                    "Effect": "Allow",
                    "Principal": "*",
                    "Action": "s3:GetObject",
                    "Resource": "arn:aws:s3:::${bucket}/*"
                }
            ]
        }`

        }
        command = new PutBucketPolicyCommand(params);
        await s3.send(command);
        // UPLOAD THE FILE HERE
        var file = await fetch(interaction.options.getAttachment('image').url);
        var blob = await file.arrayBuffer();
        var params = {
          Body: blob,
          Bucket: bucket,
          Key: "index.png",
          ContentType: "image/png"
        };
        command = new PutObjectCommand(params);
        await s3.send(command);

        var cf = new CloudFrontClient({ credentials: fromIni({ profile: "redmoon" }) });
        var params = {
          DistributionConfig: {
            CallerReference: new Date().valueOf(),
            Origins: {
              Items: [
                {
                  DomainName: bucket + '.s3-website-us-east-1.amazonaws.com',
                  Id: bucket,
                  CustomOriginConfig: {
                    HTTPPort: 80,
                    HTTPSPort: 443,
                    OriginProtocolPolicy: 'http-only',
                    OriginReadTimeout: 30,
                    OriginKeepaliveTimeout: 5,

                  },
                  OriginPath: '',
                  CustomHeaders: { Quantity: 0 }

                },
              ],
              Quantity: 1
            },
            DefaultCacheBehavior: {
              TargetOriginId: bucket,
              CachePolicyId: "658327ea-f89d-4fab-a63d-7e88639e58f6", // CachingOptimized
              ViewerProtocolPolicy: "redirect-to-https",
              AllowedMethods: {
                Quantity: 2,
                Items: [
                  "GET",
                  "HEAD"
                ]
              }
            },
            Comment: bucket,
            Enabled: true,
            ViewerCertificate: {
              ACMCertificateArn: "arn:aws:acm:us-east-1:014854788150:certificate/afe0764b-71d5-4610-a0f0-77ff845f171e", //*.rmxiv.com,
              CertificateSource: "acm",
              SSLSupportMethod: "sni-only",
              MinimumProtocolVersion: "TLSv1.2_2021"
            },
            Aliases: {
              Quantity: 1,
              Items: [bucket]
            }
          }
        };
        command = new CreateDistributionCommand(params);
        res = await cf.send(command);
        var cloudfront = res.Distribution.ARN;
        var domain = res.Distribution.DomainName;
        var id = res.Distribution.Id;
        await connection.promise().query('update kinklists set cloudfront = ?, cfdomain = ?, cf_id = ? where userid = ? and guildid = ?', [cloudfront, domain, id, interaction.member.id, interaction.guild.id]);
        // CONTINUE FROM HERE
        // Create Porkbun DNS record from variable bucketname.
        var pb_body = {
          apikey: process.env.pb_apikey,
          secretapikey: process.env.pb_secretkey,
          name: bucketname,
          type: "CNAME",
          content: domain,
          ttl: 600
        };
        const response = await fetch('https://porkbun.com/api/json/v3/dns/create/rmxiv.com', {
          method: 'post',
          body: JSON.stringify(pb_body),
          headers: { 'Content-Type': 'application/json' }
        });
        const data = await response.json();
        await connection.promise().query('update kinklists set porkbun_id = ? where userid = ? and guildid = ?', [data.id, interaction.member.id, interaction.guild.id]);
        interaction.editReply({ content: 'Your kinklist should be set up at https://' + bucket + ' in approximately five minutes.', ephemeral: true });
      }
    } else if (interaction.commandName === 'customkinklistname') {
      var name = interaction.options.getString('name');
      var exists = await connection.promise().query('select * from kinklists where subdomain = ?', [name]);
      var reserved_words = ['bounties', 'bounty-signup', 'chambers', 'handbook', 'kinklist', 'menu', 'sessionreport', 'tokentracker'];
      if (exists[0].length <= 0 && !reserved_words.includes(name)) {
        var thisKinklist = await connection.promise().query('select * from kinklists where userid = ? and guildid = ?', [interaction.member.id, interaction.guild.id]);
        if (thisKinklist[0].length > 0 && thisKinklist[0][0].subdomain != '') {
          var pb_body = {
            apikey: process.env.pb_apikey,
            secretapikey: process.env.pb_secretkey,
            name: name,
            type: "CNAME",
            content: thisKinklist[0][0].cfdomain,
            ttl: 600
          };
          const response = await fetch(`https://porkbun.com/api/json/v3/dns/edit/rmxiv.com/${thisKinklist[0][0].porkbun_id}`, {
            method: 'post',
            body: JSON.stringify(pb_body),
            headers: { 'Content-Type': 'application/json' }
          });
          const data = await response.json();
          var cf = new CloudFrontClient({ credentials: fromIni({ profile: "redmoon" }) });
          var params = {
            Id: thisKinklist[0][0].cf_id
          };
          command = new GetDistributionCommand(params);
          res = await cf.send(command);
          var params = {
            Id: thisKinklist[0][0].cf_id,
            IfMatch: res.ETag,
            DistributionConfig: {
              DefaultRootObject: "",
              WebACLId: "",
              HttpVersion: "http2",
              IsIPV6Enabled: true,
              ContinuousDeploymentPolicyId: "",
              Staging: false,
              PriceClass: 'PriceClass_All',
              CallerReference: res.Distribution.CallerReference,
              Origins: {
                Items: [
                  {
                    DomainName: `${thisKinklist[0][0].s3}.s3-website-us-east-1.amazonaws.com`,
                    Id: thisKinklist[0][0].s3,
                    CustomOriginConfig: {
                      HTTPPort: 80,
                      HTTPSPort: 443,
                      OriginProtocolPolicy: 'http-only',
                      OriginSslProtocols: {
                        Quantity: 1,
                        Items: ['TLSv1.2']
                      },
                      OriginReadTimeout: 30,
                      OriginKeepaliveTimeout: 5,

                    },
                    OriginPath: '',
                    CustomHeaders: { Quantity: 0 }

                  },
                ],
                Quantity: 1
              },
              Logging: {
                Enabled: false,
                IncludeCookies: false,
                Bucket: "placeholder-s3-bucket-for-cf-logs",
                Prefix: "a"
              },
              DefaultCacheBehavior: {
                TargetOriginId: thisKinklist[0][0].s3,
                CachePolicyId: "658327ea-f89d-4fab-a63d-7e88639e58f6", // CachingOptimized
                ViewerProtocolPolicy: "redirect-to-https",
                AllowedMethods: {
                  Quantity: 2,
                  Items: [
                    "GET",
                    "HEAD"
                  ],
                  CachedMethods: {
                    Quantity: 2,
                    Items: ["GET", "HEAD"]
                  }
                },
                SmoothStreaming: false,
                Compress: true,
                FieldLevelEncryptionId: "",
                LambdaFunctionAssociations: {
                  Quantity: 0,
                  Items: []
                }
              },
              Comment: thisKinklist[0][0].s3,
              Enabled: true,
              ViewerCertificate: {
                ACMCertificateArn: "arn:aws:acm:us-east-1:014854788150:certificate/afe0764b-71d5-4610-a0f0-77ff845f171e", //*.rmxiv.com,
                CertificateSource: "acm",
                SSLSupportMethod: "sni-only",
                MinimumProtocolVersion: "TLSv1.2_2021"
              },
              Aliases: {
                Quantity: 1,
                Items: [
                  `${name}.rmxiv.com`
                ]
              },
              CacheBehaviors: {
                Quantity: 0,
                Items: []
              },
              CustomErrorResponses: {
                Quantity: 0,
                Items: []
              },
              Restrictions: {
                GeoRestriction: {
                  RestrictionType: "none",
                  Quantity: 0,
                  Items: []
                }
              }
            }
          };
          command = new UpdateDistributionCommand(params);
          res = await cf.send(command);
          await connection.promise().query('update kinklists set subdomain = ? where userid = ? and guildid = ?', [name, interaction.member.id, interaction.guild.id]);
          await interaction.reply({ content: 'Your kinklist URL has been updated to https://' + name + '.rmxiv.com - this will likely be live for you within 10 to 15 minutes.', ephemeral: true })
        } else {
          await connection.promise().query('insert into kinklists (userid, guildid, subdomain) values (?, ?, ?)', [interaction.member.id, interaction.guild.id, name]);
          await interaction.reply({ content: 'Your custom subdomain has been saved, please use `/kinklist` to upload your kinklist image.', ephemeral: true });
        }
      } else {
        await interaction.reply({ content: 'Someone has already taken this custom subdomain, sorry', ephemeral: true });
      }

    } else if (interaction.commandName === 'stickymessage') {
      var exists = await connection.promise().query('select * from stickymessages where channel_id = ?', [interaction.options.getChannel('channel').id]);
      if (interaction.options.getInteger('speed') <= 50) {
        if (interaction.options.getString('message')) {
          var messageText = interaction.options.getString('message').replaceAll('\\n', '\n')
          var sentMessage = await interaction.options.getChannel('channel').send({ content: messageText });
        }
        if (exists[0].length > 0) {
          if (interaction.options.getString('message')) {
            await connection.promise().query('update stickymessages set message = ?, speed = ?, last_message_id = ? where channel_id = ?', [messageText, interaction.options.getInteger('speed'), sentMessage.id, interaction.options.getChannel('channel').id]);
          }
        } else {
          await connection.promise().query('insert into stickymessages (message, speed, last_message_id, channel_id) values (?, ?, ?, ?)', [messageText, interaction.options.getInteger('speed'), sentMessage.id, interaction.options.getChannel('channel').id]);
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
            interaction_second.update({ content: 'Event deleted.', components: [] });
          }
        });
      } else {
        interaction.reply({ content: 'I can\'t find any events in this server...', ephemeral: true });
      }
    } else if (interaction.commandName == 'birthday') {
      var user = interaction.options.getUser('user');
      var month = interaction.options.getInteger('month');
      var day = interaction.options.getInteger('day');
      var date = new Date().getFullYear() + '-' + month + '-' + day;
      var birthdays = await connection.promise().query('select * from birthdays where user = ? and server_id = ?', [user.id, interaction.guildId]);
      if (birthdays[0].length > 0) {
        await connection.promise().query('update birthdays set date = ? where user = ? and server_id = ?', [date, user.id, interaction.guildId]);
      } else {
        await connection.promise().query('insert into birthdays (user, date, server_id) values (?, ?, ?)', [user.id, date, interaction.guildId]);
      }
      await interaction.reply({ content: 'Birthday updated!', ephemeral: true });
    } else if (interaction.commandName == 'removebirthday') {
      var user = interaction.options.getUser('user');
      await connection.promise().query('delete from birthdays where user = ?', [user.id]);
      await interaction.reply({ content: 'Birthday deleted.', ephemeral: true });
    } else if (interaction.commandName == 'birthdaychannel') {
      var channel = interaction.options.getChannel('channel');
      var existingsetting = await connection.promise().query('select * from server_settings where server_id = ? and option_name = "birthday_channel"', [interaction.guildId]);
      if (existingsetting[0].length > 0) {
        await connection.promise().query('update server_settings set value = ? where option_name = "birthday_channel" and server_id = ?', [channel.id, interaction.guildId]);
      } else {
        await connection.promise().query('insert into server_settings (server_id, option_name, value) values (?, ?, ?)', [interaction.guildId, "birthday_channel", channel.id]);
      }
      await interaction.reply({ content: 'Channel updated!', ephemeral: true });
    } else if (interaction.commandName == 'serveropenchannel') {
      var channel = interaction.options.getChannel('channel');
      var existingsetting = await connection.promise().query('select * from server_settings where server_id = ? and option_name = "server_open_channel"', [interaction.guildId]);
      if (existingsetting[0].length > 0) {
        await connection.promise().query('update server_settings set value = ? where option_name = "server_open_channel" and server_id = ?', [channel.id, interaction.guildId]);
      } else {
        await connection.promise().query('insert into server_settings (server_id, option_name, value) values (?, ?, ?)', [interaction.guildId, "server_open_channel", channel.id]);
      }
      await interaction.reply({ content: 'Channel updated!', ephemeral: true });
    } else if (interaction.commandName == 'serveropenroles') {
      const roleSelectComponent = new RoleSelectMenuBuilder().setCustomId('ServerOpenRoleMentionMultiselector').setMinValues(1).setMaxValues(5);
      var roleSelectRow = new ActionRowBuilder().addComponents(roleSelectComponent);
      var message = await interaction.reply({ content: 'Please provide the roles to mention when Jenova opens (up to 5):', components: [roleSelectRow], ephemeral: true });
    } else if (interaction.commandName == 'namechangechannel') {
      var channel = interaction.options.getChannel('channel');
      var existingsetting = await connection.promise().query('select * from server_settings where server_id = ? and option_name = "namechange_channel"', [interaction.guildId]);
      if (existingsetting[0].length > 0) {
        await connection.promise().query('update server_settings set value = ? where option_name = "namechange_channel" and server_id = ?', [channel.id, interaction.guildId]);
      } else {
        await connection.promise().query('insert into server_settings (server_id, option_name, value) values (?, ?, ?)', [interaction.guildId, "namechange_channel", channel.id]);
      }
      await interaction.reply({ content: 'Channel updated!', ephemeral: true });
    } else if (interaction.commandName == 'minutes') {
      var time = interaction.options.getString('time');
      console.log(time);
      var minutes = time.substr(time.indexOf(':') + 1, (time.indexOf(' ') - time.indexOf(':')));
      var hours = time.substr(0, time.indexOf(':'));
      if (time.substr(time.indexOf(' ') + 1).toLowerCase() == 'pm') {
        hours += 12;
      } else if (time.substr(time.indexOf(' ') + 1).toLowerCase() == 'am' && hours == 12) {
        hours = 0;
      }
      console.log(minutes);
      console.log(hours);
      var now = new Date();

      var nextTime = new Date(now.getFullYear(), now.getMonth(), (now.getHours() < 11 ? (now.getDay() == 0 ? now.getDate() + 1 : (now.getDay == 6 ? now.getDate() + 2 : now.getDate())) : now.getDate() + 1), hours, minutes, 0, 0);
      console.log(nextTime);
      interaction.reply({ content: Math.floor(Math.abs(nextTime - now) / 1000 / 60).toString(), ephemeral: true });

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
      var event = await connection.promise().query('select e.*, r.status, mi.id as message_info_id from events e join events_messages_info mi on e.id = mi.event_id left outer join events_responses r on mi.id = r.message_info_id and r.user_id = ? where mi.rsvp_id = ?', [interaction.user.id, buttonMessage.id]);
      // Get event responses where user_id = interaction.user.id.

      var thisEvent = event[0][0];
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
  } else if (interaction.isRoleSelectMenu()) {
    if (interaction.customId == 'ServerOpenRoleMentionMultiselector') {
      await connection.promise().query('delete from server_open_announce_roles where server_id = ?', [interaction.guildId]);
      for (const role_id of interaction.values) {
        await connection.promise().query('insert into server_open_announce_roles (server_id, role_id) values (?, ?)', [interaction.guildId, role_id]);
      }
      await interaction.update({ content: 'Roles selected!', components: [] });
    }
  }
});

client.on('messageCreate', async function (message) {
  try {
    await message.fetch();
    if (message.content.startsWith('!rm ')) {
      console.log(message.channel.id);
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
          if (server.toLowerCase() === 'cactaur') {
            server = 'Cactuar';
          }
          if (servers.includes(server)) {
            var messageReply = await message.reply({
              content: "I\'m working on your verification right now! Hang tight...", allowedMentions: {
                repliedUser: false
              }
            });
            var existing_verify = await connection.promise().query('select * from successful_verifications where name = ? and server = ?', [first_name + ' ' + last_name, server]);
            if (!(existing_verify[0].length > 0 && existing_verify[0][0].userid != message.user.id)) {
              var response = await fetch('https://xivapi.com/character/search?name=' + first_name + '%20' + last_name + '&server=' + server + '&private_key=' + xivapi_private_key);
              const result = await response.json();
              console.log(result);
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
                var exists = await connection.promise().query('select * from member_registrations where member_id = ? and guild_id = ?; select * from server_settings where option_name = ? and server_id = ?', [message.member.id, message.member.guild.id, "namechange_channel", message.member.guild.id]);
                if (exists[0][1].length > 0 && exists[1][1].length > 0) {
                  console.log(exists[0][1]);
                  console.log(exists[1][1]);
                  //var channel = await client.channels.cache.get(exists[1][0].value);
                  //await channel.send({content: `The user ${message.user} has changed their name to ${first_name} ${last_name}. Their previous character can be found at <https://na.finalfantasyxiv.com/lodestone/character/${exists[0][0].lodestone_id}>.`});
                }
                await connection.promise().query('delete from member_registrations where member_id = ? and guild_id = ?; insert into member_registrations (member_id, lodestone_id, guild_id) values (?, ?, ?)', [message.member.id, message.member.guild.id, message.member.id, character_id, message.member.guild.id]);
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
                messageReply.edit({ content: '', embeds: [embeddedMessage] });
              } else {
                messageReply.edit({ content: 'I couldn\'t find this character on the Lodestone. Please try again, and ensure you entered your character name and server correctly.' });
              }
            } else {
              messageReply.edit({ content: 'You\'ve attempted to register a character that another Discord account has already registered. Please try again, or contact Emma if this is your new discord account.' });
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
    } else if (message.content.startsWith('!password')) {
      var password = message.content.substr(message.content.indexOf(' ') + 1);
      var results = zxcvbn(password);
      console.log(results.crack_times_display);
      message.reply('The password `' + password + '` will take ' + results.crack_times_display.offline_fast_hashing_1e10_per_second + ' to crack.');
    }


    //Process stickies AFTER all message stuff. TODO: Cron this.
    if (stickymessages[0]) {
      console.log('has sticky');
      var isStickyChannel = stickymessages[0].find(e => e.channel_id === message.channel.id);
      if (isStickyChannel) {
        var messageCount = await message.channel.messages.fetch({ after: isStickyChannel.last_message_id });
        if (messageCount.size >= isStickyChannel.speed && !activeStickyDeletions.includes(message.channel.id)) {
          activeStickyDeletions.push(message.channel.id);
          var channel = message.channel;
          await message.channel.messages.fetch(isStickyChannel.last_message_id).then(async (message) => {
            if (message) {
              message.delete();
            }
            var sentMessage = await message.channel.send({ content: isStickyChannel.message }); // Post sticky message
            await connection.promise().query('update stickymessages set last_message_id = ? where channel_id = ?', [sentMessage.id, isStickyChannel.channel_id]);
            stickymessages = await connection.promise().query('select * from stickymessages'); // Refresh the live cache
          }).catch((error) => { console.error(error) })
            .then(() => {
              activeStickyDeletions.splice(activeStickyDeletions.indexOf(channel.id), 1);
            }); // TODO check if message exists

        } else {
          console.log('active deletions issue?');
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
        if (message.embeds && message.embeds[0] !== undefined && message.embeds[0].image) {
          embeddedMessage.setImage(message.embeds[0].image.url);
        }
        if (message.attachments && message.attachments.first() !== undefined && message.attachments.first().contentType.startsWith('image')) {
          embeddedMessage.setImage(message.attachments.first().url);
        }
        embeddedMessage.setFields({ name: 'Source', value: '[click!](' + message.url + ')' })
          .setTimestamp();
        var channel = await client.channels.cache.get(hofData[0][0].channel);
        var hof_msg = await channel.send({ embeds: [embeddedMessage], content: reaction.count + ' ' + reaction.emoji.toString() + ' - ' + message.channel.toString() });
        await connection.promise().query('insert into hof_msg (message_id, hof_msg_id) values (?, ?)', [message.id, hof_msg.id]);
      } else {
        var channel = await client.channels.cache.get(hofData[0][0].channel);
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
      var buttonAccept = new ButtonBuilder().setCustomId('buttonAccept').setEmoji(accept.id).setStyle('Secondary');
      var buttonTentative = new ButtonBuilder().setCustomId('buttonTentative').setEmoji(tentative.id).setStyle('Secondary');
      var buttonDecline = new ButtonBuilder().setCustomId('buttonDecline').setEmoji(decline.id).setStyle('Secondary');
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
  var date = new Date();
  var summaries = await connection.promise().query('select * from birthdays_summaries where month = ? and year = ?', [date.getMonth() + 1, date.getFullYear()]);
  if (summaries[0].length == 0) {
    var birthdays = await connection.promise().query('select user, day(date) as day, server_id from birthdays where month(date) = ? and day(date) = ? order by server_id', [date.getMonth() + 1, date.getDate()]);
    if (birthdays[0].length > 0) {
      var birthdays_by_server = [];
      for (const birthday of birthdays[0]) {
        if (!birthdays_by_server[birthday.server_id]) {
          birthdays_by_server[birthday.server_id] = [{ user: birthday.user, day: birthday.day }];
        } else {
          birthdays_by_server[birthday.server_id].push({ user: birthday.user, day: birthday.day });
        }
      }
      var channelMessages = [];
      for (const [server_id, thisBirthdaySet] of Object.entries(birthdays_by_server)) {
        // Get server setting per server to check channel
        var birthday_channel = await connection.promise().query('select value as channel from server_settings where server_id = ? and option_name = ?', [server_id, "birthday_channel"]);
        if (birthday_channel[0].length > 0) {
          for (const thisBirthday of thisBirthdaySet) {
            if (channelMessages[birthday_channel[0][0].channel]) {
              channelMessages[birthday_channel[0][0].channel] += '<@' + thisBirthday.user + '>\n';
            } else {
              channelMessages[birthday_channel[0][0].channel] = '**This Month\'s Birthdays:**\n\n<@' + thisBirthday.user + '> - ' + thisBirthday.day + '\n';
            }
          }
        }
      }
      for (const [channel_id, thisMessage] of Object.entries(channelMessages)) {
        var channel = await client.channels.cache.get(channel_id);
        channel.send(thisMessage);
      }
      await connection.promise().query('insert into birthdays_summaries (month, year) values (?, ?)', [date.getMonth() + 1, date.getFullYear()]);
    }
  }
  var todays_birthdays = await connection.promise().query('select user, server_id from birthdays where month(date) = ? and day(date) = ? and year_posted < ?', [date.getMonth() + 1, date.getDate(), date.getFullYear()]);
  if (todays_birthdays[0].length > 0) {
    birthdays_by_server = [];
    for (const birthday of todays_birthdays[0]) {
      if (!birthdays_by_server[birthday.server_id]) {
        birthdays_by_server[birthday.server_id] = [{ user: birthday.user }];
      } else {
        birthdays_by_server[birthday.server_id].push({ user: birthday.user });
      }
      // order by server id
      for (const [server_id, thisBirthdaySet] of Object.entries(birthdays_by_server)) {
        // get server setting per server to check channel
        var birthday_channel = await connection.promise().query('select value as channel from server_settings where server_id = ? and option_name = ?', [server_id, "birthday_channel"]);
        if (birthday_channel[0].length > 0) {
          for (const thisBirthday of thisBirthdaySet) {
            var channel = await client.channels.cache.get(birthday_channel[0][0].channel);
            var guild = await client.guilds.cache.get(server_id);
            if (guild.members.cache.get(thisBirthday.user)) {
              await channel.send('<@' + thisBirthday.user + '> has a birthday today!');
              await connection.promise().query('update birthdays set year_posted = ? where user = ? and server_id = ?', [date.getFullYear(), thisBirthday.user, server_id]);
            }
          }
        }
      }
    }
  }

  var response = await fetch('https://api.xivstatus.com/api/servers');
  const result = await response.json();
  var jenova = result.find(item => item.name == "Jenova");
  if (jenova.congestion && jenova.congestion != 'Congested') {
    var last_status = await connection.promise().query('select * from server_status');
    if (last_status[0][0].status == 'Congested') {
      var servers = await connection.promise().query('select * from server_settings where option_name = ?', ['server_open_channel']);
      if (servers[0].length > 0) {
        for (const thisServer of servers[0]) {
          var messageContent = '';
          // Remember , var date is ALREADY today's date, we dont need to get it again rn.
          var last_week = new Date();
          last_week.setDate(date.getDate() - 7);
          var last_open_date = new Date(last_status[0][0].last_open);
          if (last_open_date < last_week) {
            var roles = await connection.promise().query('select * from server_open_announce_roles where server_id = ?', [thisServer.id]);
            for (const role of roles[0]) {
              var roleMention = await client.roles.cache.get(role.role_id);
              messageContent += `${roleMention} `;
            }
          }
          messageContent += '\n **Jenova is now open for transfers!**';
          var channel = client.channels.cache.get(thisServer.value);
          channel.send(messageContent);
        }
      }
      await connection.promise().query('update server_status set status = ?,  last_open = ?', [jenova.congestion, date.toISOString().split('T')[0]]);
    }
  } else {
    console.log(jenova);
    if (jenova.congestion) {
      await connection.promise().query('update server_status set status = ?', [jenova.congestion]);
    }
  }

}, 60000);