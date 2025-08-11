const { Client, GatewayIntentBits, PermissionsBitField, ActivityType, Collection } = require('discord.js');
// Système anti-doublon pour les commandes
const processedMessages = new Set();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers, // Nécessaire pour récupérer les membres
        GatewayIntentBits.MessageContent, // Si vous voulez lire le contenu des messages
        GatewayIntentBits.GuildPresences, // Nécessaire pour la commande dmonline
    ],
});

// Remplacez par une liste d'IDs des utilisateurs autorisés
const AUTHORIZED_USERS = ['owner_1', 'owner_2', 'owner_3'];

// Token du bot
const BOT_TOKEN = "TOKEN";

client.once('ready', () => {
    console.log(`Connecté en tant que ${client.user.tag}`);

    // Le bot affiche une bulle verte (en ligne)
    client.user.setPresence({
        status: 'online'
    });
});

client.on('messageCreate', async (message) => {
    // Ignorer les messages des bots
    if (message.author.bot) return;

    // Vérifier si c'est une commande
    if (message.content.startsWith('!!')) {
        // Vérifier si le message a déjà été traité
        const messageId = `${message.id}-${message.author.id}`;
        if (processedMessages.has(messageId)) {
            return; // Ignorer les messages déjà traités
        }
        
        // Marquer le message comme traité
        processedMessages.add(messageId);
        
        // Nettoyer le Set pour éviter les fuites de mémoire (après 1 minute)
        setTimeout(() => {
            processedMessages.delete(messageId);
        }, 60000);
        
        const args = message.content.slice(2).trim().split(/ +/);
        const command = args.shift().toLowerCase();

        // Vérifier si l'utilisateur est autorisé pour les commandes sensibles
        if (['dmall', 'dmonline', 'dmrole', 'dmembed', 'dmimage', 'status', 'setavatar', 'setname', 'help'].includes(command)) {
            if (!AUTHORIZED_USERS.includes(message.author.id)) {
                return message.reply("❌ Vous n'êtes pas autorisé à utiliser cette commande.");
            }
        }

        // Commande `!!dmall` - Envoie un DM à tous les membres
        if (command === 'dmall') {
            const dmMessage = args.join(' ');
            if (!dmMessage) {
                return message.reply("❌ Veuillez fournir un message à envoyer.");
            }

            try {
                const members = await message.guild.members.fetch();
                let sentCount = 0;

                message.reply("⏳ Envoi des messages en cours...");

                for (const [, member] of members) {
                    if (!member.user.bot) {
                        const personalizedMessage = dmMessage.replace(/{user}/g, `<@${member.user.id}>`);

                        try {
                            await member.send(personalizedMessage);
                            sentCount++;
                            console.log(`✅ Message envoyé à ${member.user.tag}`);
                        } catch (err) {
                            console.error(`❌ Impossible d'envoyer un message à ${member.user.tag}: ${err}`);
                        }
                    }
                }

                message.channel.send(`✅ Message envoyé à ${sentCount} membres.`);
            } catch (err) {
                console.error("❌ Erreur lors de la récupération des membres:", err);
                message.reply("❌ Une erreur s'est produite lors de l'envoi des messages.");
            }
        }

        // Commande `!dmonline` - Envoie un DM uniquement aux membres en ligne
        else if (command === 'dmonline') {
            const dmMessage = args.join(' ');
            if (!dmMessage) {
                return message.reply("❌ Veuillez fournir un message à envoyer.");
            }

            try {
                const members = await message.guild.members.fetch();
                let sentCount = 0;

                message.reply("⏳ Envoi des messages aux membres en ligne...");

                for (const [, member] of members) {
                    if (!member.user.bot && member.presence?.status === 'online') {
                        const personalizedMessage = dmMessage.replace(/{user}/g, `<@${member.user.id}>`);

                        try {
                            await member.send(personalizedMessage);
                            sentCount++;
                            console.log(`✅ Message envoyé à ${member.user.tag} (en ligne)`);
                        } catch (err) {
                            console.error(`❌ Impossible d'envoyer un message à ${member.user.tag}: ${err}`);
                        }
                    }
                }

                message.channel.send(`✅ Message envoyé à ${sentCount} membres en ligne.`);
            } catch (err) {
                console.error("❌ Erreur:", err);
                message.reply("❌ Une erreur s'est produite lors de l'envoi des messages.");
            }
        }

        // Commande `!dmrole` - Envoie un DM aux membres ayant un rôle spécifique
        else if (command === 'dmrole') {
            const roleId = args[0];
            if (!roleId) {
                return message.reply("❌ Veuillez spécifier l'ID du rôle: `!!dmrole <ID_ROLE> <message>`");
            }

            const dmMessage = args.slice(1).join(' ');
            if (!dmMessage) {
                return message.reply("❌ Veuillez fournir un message à envoyer.");
            }

            try {
                const role = message.guild.roles.cache.get(roleId);
                if (!role) {
                    return message.reply("❌ Rôle non trouvé. Vérifiez l'ID du rôle.");
                }

                const members = await message.guild.members.fetch();
                let sentCount = 0;

                message.reply(`⏳ Envoi des messages aux membres avec le rôle ${role.name}...`);

                for (const [, member] of members) {
                    if (!member.user.bot && member.roles.cache.has(roleId)) {
                        const personalizedMessage = dmMessage.replace(/{user}/g, `<@${member.user.id}>`);

                        try {
                            await member.send(personalizedMessage);
                            sentCount++;
                            console.log(`✅ Message envoyé à ${member.user.tag} (rôle: ${role.name})`);
                        } catch (err) {
                            console.error(`❌ Impossible d'envoyer un message à ${member.user.tag}: ${err}`);
                        }
                    }
                }

                message.channel.send(`✅ Message envoyé à ${sentCount} membres avec le rôle ${role.name}.`);
            } catch (err) {
                console.error("❌ Erreur:", err);
                message.reply("❌ Une erreur s'est produite lors de l'envoi des messages.");
            }
        }

        // Commande `!dmembed` - Envoie un embed en DM à tous les membres
        else if (command === 'dmembed') {
            const title = args[0];
            const description = args.slice(1).join(' ');

            if (!title || !description) {
                return message.reply("❌ Format: `!!dmembed <titre> <description>`");
            }

            try {
                const { EmbedBuilder } = require('discord.js');
                const embed = new EmbedBuilder()
                    .setColor(0x800080) // Violet foncé
                    .setTitle(title)
                    .setDescription(description)
                    .setTimestamp()
                    .setFooter({ text: `Envoyé par ${message.author.tag}` });

                const members = await message.guild.members.fetch();
                let sentCount = 0;

                message.reply("⏳ Envoi des embeds en cours...");

                for (const [, member] of members) {
                    if (!member.user.bot) {
                        // Personnalisation pour chaque utilisateur
                        const personalizedEmbed = EmbedBuilder.from(embed)
                            .setDescription(description.replace(/{user}/g, `<@${member.user.id}>`));

                        try {
                            await member.send({ embeds: [personalizedEmbed] });
                            sentCount++;
                            console.log(`✅ Embed envoyé à ${member.user.tag}`);
                        } catch (err) {
                            console.error(`❌ Impossible d'envoyer un embed à ${member.user.tag}: ${err}`);
                        }
                    }
                }

                message.channel.send(`✅ Embed envoyé à ${sentCount} membres.`);
            } catch (err) {
                console.error("❌ Erreur:", err);
                message.reply("❌ Une erreur s'est produite lors de l'envoi des embeds.");
            }
        }

        // Commande `!help` - Affiche toutes les commandes disponibles
        else if (command === 'help') {
            const { EmbedBuilder } = require('discord.js');

            const helpEmbed = new EmbedBuilder()
                .setColor(0x800080) // Violet foncé
                .setTitle('Commandes disponibles')
                .setDescription('Voici la liste des commandes disponibles :')
                .addFields(
                    { name: '📨 Commandes de message', value: 
                        '`!!dmall <message>` - Envoie un message privé à tous les membres\n' +
                        '`!!dmonline <message>` - Envoie un message privé aux membres en ligne\n' +
                        '`!!dmrole <ID_ROLE> <message>` - Envoie un message privé aux membres d\'un rôle\n' +
                        '`!!dmembed <titre> <description>` - Envoie un embed à tous les membres\n' +
                        '`!!dmimage <URL_IMAGE> [texte]` - Envoie une image à tous les membres'
                    },
                    { name: '⚙️ Commandes de gestion', value: 
                        '`!!status <texte>` - Change le statut du bot\n' +
                        '`!!setavatar <URL_IMAGE>` - Change l\'avatar du bot\n' +
                        '`!!setname <nouveau_nom>` - Change le nom du bot\n' +
                        '`!!stats` - Affiche les statistiques du bot\n' +
                        '`!!server` - Affiche les commandes utiles du serveur'
                    },
                    { name: '💡 Astuce', value: 'Utilisez {user} dans vos messages pour mentionner l\'utilisateur qui reçoit le message.' }
                )
                .setFooter({ text: 'Bot DM Manager' })
                .setTimestamp();

            return message.channel.send({ embeds: [helpEmbed] });
        }
        
        // Commande `!server` - Affiche les commandes utiles du serveur
        else if (command === 'server') {
            const { EmbedBuilder } = require('discord.js');
            
            const serverEmbed = new EmbedBuilder()
                .setColor(0x800080) // Violet foncé
                .setTitle('📚 Guide du Serveur')
                .setDescription('Bienvenue sur le serveur! Voici quelques commandes et informations utiles:')
                .addFields(
                    { name: '🛠️ Commandes Discord Utiles', value: 
                        '`/nick <nouveau_pseudo>` - Change ton pseudo\n' +
                        '`/userinfo <@utilisateur>` - Voir les infos d\'un utilisateur\n' +
                        '`/afk <raison>` - Indique que tu es AFK\n' +
                        '`/role` - Gérer tes rôles personnalisés'
                    },
                    { name: '🔔 Notifications', value: 
                        '• Cliquez sur le nom du canal -> Notifications -> Tous les messages / Mentions seulement\n' +
                        '• Utilisez `/roleinfo` pour voir les rôles à mention\n' +
                        '• Désactivez les @everyone et @here dans vos paramètres'
                    },
                    { name: '🤝 Règles Importantes', value: 
                        '• Soyez respectueux envers tous les membres\n' +
                        '• Pas de spam ou de publicité non autorisée\n' +
                        '• Utilisez les canaux appropriés pour vos messages\n' +
                        '• Suivez les directives de Discord (ToS)'
                    },
                    { name: '🔗 Liens Utiles', value: 
                        '• [Invitation du serveur](https://discord.gg/chitanda)\n' +
                        '• [Site du serveur](https://discord.gg/chitanda)\n' +
                        '• [Charte des règles complètes](https://discord.gg/chitanda)'
                    }
                )
                .setImage('https://media.discordapp.net/attachments/973918931771756564/988823071530274876/divider2.gif')
                .setFooter({ text: 'Pour plus d\'informations, contactez le staff' })
                .setTimestamp();
                
            return message.channel.send({ embeds: [serverEmbed] });
        }

        // Commandes de gestion du bot

        // Commande `!status` - Change le statut du bot
        else if (command === 'status') {
            if (!args[0]) {
                return message.reply("❌ Format: `!!status <texte>`");
            }

            const statusText = args.join(' ');
            client.user.setActivity(statusText, { type: ActivityType.Streaming, url: "https://twitch.tv/chitanda" });
            message.reply(`✅ Statut du bot mis à jour: Streaming **${statusText}**`);
        }

        // Commande `!setavatar` - Change l'avatar du bot
        else if (command === 'setavatar') {
            if (!args[0]) {
                return message.reply("❌ Format: `!!setavatar <URL_IMAGE>`");
            }

            try {
                await client.user.setAvatar(args[0]);
                message.reply("✅ Avatar du bot mis à jour avec succès!");
            } catch (error) {
                console.error("❌ Erreur lors de la mise à jour de l'avatar:", error);
                message.reply("❌ Erreur lors de la mise à jour de l'avatar. Vérifiez l'URL ou réessayez plus tard.");
            }
        }

        // Commande `!setname` - Change le nom du bot
        else if (command === 'setname') {
            if (!args[0]) {
                return message.reply("❌ Format: `!!setname <nouveau_nom>`");
            }

            const newName = args.join(' ');
            try {
                await client.user.setUsername(newName);
                message.reply(`✅ Nom du bot changé en: **${newName}**`);
            } catch (error) {
                console.error("❌ Erreur lors du changement de nom:", error);
                message.reply("❌ Erreur lors du changement de nom. Les changements de nom sont limités par Discord, réessayez plus tard.");
            }
        }

        // Commande `!stats` - Affiche les statistiques du bot
        else if (command === 'stats') {
            const { EmbedBuilder } = require('discord.js');

            const uptime = formatUptime(client.uptime);
            const serverCount = client.guilds.cache.size;
            const memberCount = client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0);

            const statsEmbed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle('📊 Statistiques du Bot')
                .addFields(
                    { name: '⏱️ Uptime', value: uptime, inline: true },
                    { name: '🌐 Serveurs', value: serverCount.toString(), inline: true },
                    { name: '👥 Utilisateurs', value: memberCount.toString(), inline: true },
                    { name: '🏓 Ping', value: `${client.ws.ping}ms`, inline: true },
                    { name: '🧠 Mémoire', value: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} MB`, inline: true }
                )
                .setFooter({ text: `ID: ${client.user.id}` })
                .setTimestamp();

            message.channel.send({ embeds: [statsEmbed] });
        }

        // Commande `!dmimage` - Envoie une image en DM à tous les membres
        else if (command === 'dmimage') {
            const imageUrl = args[0];
            const text = args.slice(1).join(' ');

            if (!imageUrl) {
                return message.reply("❌ Format: `!!dmimage <URL_IMAGE> [texte optionnel]`");
            }

            try {
                const members = await message.guild.members.fetch();
                let sentCount = 0;

                message.reply("⏳ Envoi des images en cours...");

                for (const [, member] of members) {
                    if (!member.user.bot) {
                        const personalizedText = text ? text.replace(/{user}/g, `<@${member.user.id}>`) : '';

                        try {
                            await member.send({
                                content: personalizedText,
                                files: [{ attachment: imageUrl }]
                            });
                            sentCount++;
                            console.log(`✅ Image envoyée à ${member.user.tag}`);
                        } catch (err) {
                            console.error(`❌ Impossible d'envoyer une image à ${member.user.tag}: ${err}`);
                        }
                    }
                }

                message.channel.send(`✅ Image envoyée à ${sentCount} membres.`);
            } catch (err) {
                console.error("❌ Erreur:", err);
                message.reply("❌ Une erreur s'est produite lors de l'envoi des images.");
            }
        }
    }
});

// Fonction pour formater le temps d'activité du bot
function formatUptime(ms) {
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / (1000 * 60)) % 60);
    const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));

    return `${days}j ${hours}h ${minutes}m ${seconds}s`;
}

// Connecter le bot
client.login(BOT_TOKEN);
