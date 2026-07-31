/**
 * 🛡️ SN SECURITY v6.0 — ARCHIVO PRINCIPAL (index.js)
 * Sistema Global de Seguridad, Moderación y Apelaciones para STEAL NATION
 * Versión Stateless + Auto-Deploy de Comandos Slash
 */

require('dotenv').config();
const express = require('express');
const { 
    Client, 
    GatewayIntentBits, 
    Partials, 
    Collection, 
    EmbedBuilder, 
    PermissionFlagsBits, 
    ChannelType,
    REST,
    Routes
} = require('discord.js');
const fs = require('fs');
const path = require('path');

// ==========================================
// 1. SERVIDOR EXPRESS (KEEP-ALIVE & HEALTH)
// ==========================================
const app = express();
const PORT = process.env.PORT || 10000;

app.get('/', (req, res) => {
    res.status(200).send('🛡️ SN SECURITY v6.0 -- ONLINE & PROTECTING');
});

app.get('/health', (req, res) => {
    res.status(200).json({
        status: client.isReady() ? 'online' : 'starting',
        ping: client.ws?.ping ?? 0
    });
});

app.listen(PORT, () => {
    console.log(`🌐 Servidor Web Express activo en puerto ${PORT}`);
});

// ==========================================
// 2. INICIALIZACIÓN DEL CLIENTE DISCORD
// ==========================================
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildBans,
        GatewayIntentBits.GuildEmojisAndStickers,
        GatewayIntentBits.GuildIntegrations,
        GatewayIntentBits.GuildWebhooks,
        GatewayIntentBits.GuildInvites,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages
    ],
    partials: [
        Partials.User, 
        Partials.Channel, 
        Partials.GuildMember, 
        Partials.Message, 
        Partials.Reaction
    ]
});

client.commands = new Collection();

// Colecciones en memoria (Reemplazo Stateless de SQLite)
client.memoryStorage = {
    guildConfig: new Collection(),
    staffRoles: new Collection(),
    userWarns: new Collection()
};

client.snCache = {
    joins: new Collection(),
    antiNukeActions: new Collection()
};

const CONFIG = {
    COLOR_PRIMARY: '#2b2d31',
    COLOR_SUCCESS: '#57f287',
    COLOR_WARNING: '#fee75c',
    COLOR_DANGER: '#ed4245'
};

// ==========================================
// 3. CARGADOR MODULAR & AUTO-DEPLOY DE COMANDOS
// ==========================================
const commandsPath = path.join(__dirname, 'commands');
if (fs.existsSync(commandsPath)) {
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);
        if ('data' in command && 'execute' in command) {
            client.commands.set(command.data.name, command);
            console.log(`[HANDLER] Comando cargado: /${command.data.name}`);
        }
    }
} else {
    console.warn('⚠️ Carpeta /commands no encontrada.');
}

async function deployCommands() {
    const commands = [];

    for (const command of client.commands.values()) {
        commands.push(command.data.toJSON());
    }

    if (!process.env.CLIENT_ID) {
        console.error('❌ Falta CLIENT_ID en las variables de entorno para registrar comandos.');
        return;
    }

    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

    try {
        console.log(`🔄 Registrando ${commands.length} comandos Slash en STEAL NATION...`);

        await rest.put(
            Routes.applicationGuildCommands(
                process.env.CLIENT_ID,
                '1528288052802355220'
            ),
            { body: commands }
        );

        console.log('✅ Comandos Slash registrados correctamente en el servidor.');
    } catch (error) {
        console.error('❌ Error registrando comandos:', error);
    }
}

// ==========================================
// 4. EVENTOS NATIVOS
// ==========================================
client.once('ready', async () => {
    console.log(`\n========================================`);
    console.log(`🛡️ SN SECURITY v6.0 (AUTO-DEPLOY EDITION)`);
    console.log(`Bot Tag: ${client.user.tag}`);
    console.log(`Servidores: ${client.guilds.cache.size}`);
    console.log(`========================================\n`);

    // Registro automático de comandos Slash
    await deployCommands();

    client.user.setPresence({
        activities: [{ name: '🛡️ STEAL NATION | /guia', type: 3 }],
        status: 'dnd'
    });
});

// ==========================================
// 5. INTERACCIONES & CONTROL DE TICKETS
// ==========================================
client.on('interactionCreate', async (interaction) => {
    if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);
        if (command) {
            try {
                await command.execute(interaction);
            } catch (error) {
                console.error(`Error procesando /${interaction.commandName}:`, error);
                await interaction.reply({ content: '❌ Ocurrió un error al ejecutar la orden.', ephemeral: true });
            }
        }
    }

    if (interaction.isButton()) {
        const id = interaction.customId;

        if (id.startsWith('guide_')) {
            const guiaModule = client.commands.get('guia');
            if (guiaModule && guiaModule.handleButton) {
                return guiaModule.handleButton(interaction);
            }
        }

        if (id === 'dm_appeal') {
            return interaction.reply({ content: '🎫 Ingresa al servidor correspondiente y usa el panel de apelaciones.', ephemeral: true });
        }
        if (id === 'dm_evidence') {
            return interaction.reply({ content: '📜 Las evidencias se encuentran adjuntas dentro del caso del servidor.', ephemeral: true });
        }

        if (id.startsWith('appeal_')) {
            const appealType = id.split('_')[1];
            if (appealType === 'status') return interaction.reply({ content: '🔍 No cuentas con apelaciones activas registradas.', ephemeral: true });

            const guild = interaction.guild;
            const targetChannelName = `appeal-${interaction.user.id}`;

            const existingChannel = guild.channels.cache.find(c => c.name === targetChannelName);
            if (existingChannel) {
                return interaction.reply({
                    content: `❌ Ya tienes una apelación abierta en este momento: ${existingChannel}`,
                    ephemeral: true
                });
            }

            const staffRoles = client.memoryStorage.staffRoles.get(guild.id) || [];
            
            const permissionOverwrites = [
                { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                { id: client.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels] }
            ];

            staffRoles.forEach(roleId => {
                permissionOverwrites.push({
                    id: roleId,
                    allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages]
                });
            });

            try {
                const ticketChannel = await guild.channels.create({
                    name: targetChannelName,
                    type: ChannelType.GuildText,
                    permissionOverwrites: permissionOverwrites
                });

                const embedTicket = new EmbedBuilder()
                    .setTitle(`🎫 Ticket de Apelación: ${appealType.toUpperCase()}`)
                    .setDescription(`Hola ${interaction.user}, expón tu caso. Un miembro autorizado del Staff atenderá esta solicitud.`)
                    .setColor(CONFIG.COLOR_PRIMARY);

                await ticketChannel.send({ content: `${interaction.user}`, embeds: [embedTicket] });
                await interaction.reply({ content: `✅ Ticket de apelación creado: ${ticketChannel}`, ephemeral: true });
            } catch (err) {
                console.error('Error al crear ticket:', err);
                await interaction.reply({ content: '❌ No se pudo crear el ticket. Revisa los permisos del bot.', ephemeral: true });
            }
        }
    }
});

// ==========================================
// 6. CONTROL GLOBAL DE ERRORES (CRASH PREVENTION)
// ==========================================
process.on('unhandledRejection', (error) => {
    console.error('❌ Unhandled Rejection:', error);
});

process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
});

client.on('error', (error) => {
    console.error('❌ Discord Client Error:', error);
});

// ==========================================
// 7. AUTENTICACIÓN
// ==========================================
if (!process.env.DISCORD_TOKEN) {
    console.error('❌ Falta DISCORD_TOKEN en las variables de entorno.');
    process.exit(1);
}

client.login(process.env.DISCORD_TOKEN);
