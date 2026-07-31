/**
 * 🛡️ SN SECURITY v6.0 — ARCHIVO PRINCIPAL (index.js)
 * Sistema Global de Seguridad, Moderación y Apelaciones para STEAL NATION
 * Preparado para Despliegue en Render + GitHub
 */

require('dotenv').config();
const express = require('express');
const { 
    Client, 
    GatewayIntentBits, 
    Partials, 
    Collection, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    PermissionFlagsBits, 
    ChannelType
} = require('discord.js');
const Database = require('better-sqlite3');
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
// 2. BASE DE DATOS PERSISTENTE Y AUTODETECTABLE
// ==========================================
let dbPath = './sn_security.db';

if (process.env.RENDER) {
    if (fs.existsSync('/data')) {
        dbPath = '/data/sn_security.db';
    } else {
        console.warn('⚠️ [AVISO] Render detectado pero /data no existe. Usando almacenamiento efímero local.');
    }
}

const db = new Database(dbPath);

db.exec(`
    CREATE TABLE IF NOT EXISTS guild_config (
        guild_id TEXT PRIMARY KEY,
        log_channel_id TEXT,
        appeal_channel_id TEXT,
        automod_enabled INTEGER DEFAULT 1,
        antiraid_enabled INTEGER DEFAULT 1,
        antinuke_enabled INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS staff_roles (
        guild_id TEXT,
        role_id TEXT,
        PRIMARY KEY (guild_id, role_id)
    );

    CREATE TABLE IF NOT EXISTS user_warns (
        guild_id TEXT,
        user_id TEXT,
        warns INTEGER DEFAULT 0,
        PRIMARY KEY (guild_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS global_blacklist (
        user_id TEXT PRIMARY KEY,
        reason TEXT,
        added_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
`);

const dbQuery = {
    getConfig: db.prepare('SELECT * FROM guild_config WHERE guild_id = ?'),
    getStaffRoles: db.prepare('SELECT role_id FROM staff_roles WHERE guild_id = ?'),
    addStaffRole: db.prepare('INSERT OR IGNORE INTO staff_roles (guild_id, role_id) VALUES (?, ?)'),
    removeStaffRole: db.prepare('DELETE FROM staff_roles WHERE guild_id = ? AND role_id = ?'),
    getWarns: db.prepare('SELECT warns FROM user_warns WHERE guild_id = ? AND user_id = ?'),
    setWarns: db.prepare(`
        INSERT INTO user_warns (guild_id, user_id, warns) VALUES (?, ?, ?)
        ON CONFLICT(guild_id, user_id) DO UPDATE SET warns = excluded.warns
    `)
};

// ==========================================
// 3. INICIALIZACIÓN DEL CLIENTE DISCORD
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
client.dbQuery = dbQuery;
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
// 4. CARGADOR MODULAR DE COMANDOS
// ==========================================
const commandsPath = path.join(__dirname, 'commands');
if (fs.existsSync(commandsPath)) {
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);
        if ('data' in command && 'execute' in command) {
            client.commands.set(command.data.name, command);
            console.log(`[HANDLER] Comando registrado: /${command.data.name}`);
        }
    }
} else {
    console.warn('⚠️ Carpeta /commands no encontrada. Crea la carpeta para cargar comandos.');
}

// ==========================================
// 5. EVENTOS NATIVOS
// ==========================================
client.once('ready', () => {
    console.log(`\n========================================`);
    console.log(`🛡️ SN SECURITY v6.0 (PROD READY)`);
    console.log(`Ruta SQLite activa: ${dbPath}`);
    console.log(`Bot Tag: ${client.user.tag}`);
    console.log(`Servidores: ${client.guilds.cache.size}`);
    console.log(`========================================\n`);

    client.user.setPresence({
        activities: [{ name: '🛡️ STEAL NATION | /guia', type: 3 }],
        status: 'dnd'
    });
});

// ==========================================
// 6. INTERACCIONES & CONTROL DE TICKETS POR ID
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

            const staffRolesData = dbQuery.getStaffRoles.all(guild.id);
            const permissionOverwrites = [
                { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                { id: client.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels] }
            ];

            staffRolesData.forEach(r => {
                permissionOverwrites.push({
                    id: r.role_id,
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
// 7. CONTROL GLOBAL DE ERRORES (CRASH PREVENTION)
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
// 8. AUTENTICACIÓN Y VERIFICACIÓN PREVIA
// ==========================================
if (!process.env.DISCORD_TOKEN) {
    console.error('❌ Falta DISCORD_TOKEN en las variables de entorno.');
    process.exit(1);
}

client.login(process.env.DISCORD_TOKEN);
