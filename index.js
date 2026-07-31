import { 
  Client, 
  GatewayIntentBits, 
  SlashCommandBuilder, 
  REST, 
  Routes, 
  EmbedBuilder, 
  PermissionFlagsBits,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  Collection,
  ActivityType
} from 'discord.js';
import { GoogleGenAI } from '@google/genai';
import express from 'express';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

// Servidor Web para Mantener Vivo el Servicio en Render
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('✅ SN Bump AI está en línea.');
});

app.listen(PORT, () => {
  console.log(`🌐 Servidor web iniciado en el puerto ${PORT}`);
});

// Configuración Fija
const GLOBAL_CHANNEL_ID = '1532839044025810994';
const MAX_BUMPS_PER_DAY = 6; // Sistema anti-abuso

// Cliente de Discord
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildInvites
  ]
});

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Persistencia de Datos
const DB_FILE = './database.json';
let db = {
  configs: {}, // guildId: { roleId, template, cooldownHours, remindersEnabled, reminderChannelId, logsChannelId, embedColor, embedBanner }
  stats: { totalBumps: 0, serverBumps: {} },
  activeBumps: {}, 
  dailyLimits: {}, // guildId: { date: 'YYYY-MM-DD', count: N }
  blacklist: [],
  logs: []
};

if (fs.existsSync(DB_FILE)) {
  try { db = { ...db, ...JSON.parse(fs.readFileSync(DB_FILE, 'utf-8')) }; } 
  catch (e) { console.error("Error cargando DB:", e); }
}

function saveDB() {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

function getFormattedTime(ms) {
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const mins = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

async function logEvent(guildId, title, description, color = '#3498db') {
  const timestamp = new Date().toISOString();
  db.logs.push({ guildId, title, description, timestamp });
  saveDB();

  const config = db.configs[guildId];
  if (config && config.logsChannelId) {
    try {
      const channel = await client.channels.fetch(config.logsChannelId).catch(() => null);
      if (channel && channel.permissionsFor(channel.guild.members.me).has(PermissionFlagsBits.SendMessages)) {
        await channel.send({ embeds: [new EmbedBuilder().setTitle(`📝 ${title}`).setDescription(description).setColor(color).setTimestamp()] });
      }
    } catch (err) {}
  }
}

// LÓGICA CENTRAL DE BUMP
async function executeBump(interaction) {
  const { guildId, guild, member, user } = interaction;
  const config = db.configs[guildId];

  if (!config || !config.roleId) return interaction.reply({ content: '⚠️ Bot no configurado. Usa `/setup` o `/rol-bump`.', flags: 64 });
  if (!config.template) return interaction.reply({ content: '⚠️ Falta la plantilla promocional (`/plantilla-bump`).', flags: 64 });
  if (!member.roles.cache.has(config.roleId) && !member.permissions.has(PermissionFlagsBits.Administrator)) {
    return interaction.reply({ content: '❌ No tienes el rol requerido para esto.', flags: 64 });
  }

  // Anti-abuso Diario
  const today = new Date().toISOString().split('T')[0];
  if (!db.dailyLimits[guildId] || db.dailyLimits[guildId].date !== today) {
    db.dailyLimits[guildId] = { date: today, count: 0 };
  }
  if (db.dailyLimits[guildId].count >= MAX_BUMPS_PER_DAY) {
    return interaction.reply({ content: `🚫 Límite diario alcanzado. Máximo ${MAX_BUMPS_PER_DAY} bumps por día para evitar SPAM.`, flags: 64 });
  }

  if (db.activeBumps[guildId]) {
    const remainingMs = db.activeBumps[guildId].expiresAt - Date.now();
    return interaction.reply({ content: `⏳ Cooldown activo. Podrás reenviar en **${getFormattedTime(remainingMs)}**.`, flags: 64 });
  }

  await interaction.deferReply({ flags: 64 });

  const globalChannel = await client.channels.fetch(GLOBAL_CHANNEL_ID).catch(() => null);
  if (!globalChannel) return interaction.editReply({ content: '❌ Error conectando al canal global oficial.' });

  // Gestión Inteligente de Invitaciones
  let inviteUrl = null;
  const me = guild.members.me;

  if (me.permissions.has(PermissionFlagsBits.ManageGuild)) {
    const invites = await guild.invites.fetch().catch(() => new Collection());
    const valid = invites.find(i => !i.expiresAt && i.maxUses === 0);
    if (valid) inviteUrl = valid.url;
  }

  if (!inviteUrl && me.permissions.has(PermissionFlagsBits.CreateInstantInvite)) {
    const targetChannel = guild.systemChannel || guild.channels.cache.find(c => c.isTextBased() && c.permissionsFor(me).has(PermissionFlagsBits.CreateInstantInvite));
    if (targetChannel) {
      const inv = await targetChannel.createInvite({ maxAge: 0, maxUses: 0 }).catch(() => null);
      if (inv) inviteUrl = inv.url;
    }
  }
  
  if (!inviteUrl) inviteUrl = 'https://discord.com/';

  // Construcción del Embed
  const bumpEmbed = new EmbedBuilder()
    .setTitle(`🚀 ${guild.name}`)
    .setDescription(config.template)
    .addFields(
      { name: '👥 Miembros', value: `${guild.memberCount}`, inline: true },
      { name: '👤 Promocionado por', value: `<@${user.id}>`, inline: true }
    )
    .setThumbnail(guild.iconURL({ dynamic: true }))
    .setColor(config.embedColor && /^#[0-9A-F]{6}$/i.test(config.embedColor) ? config.embedColor : '#7289DA')
    .setTimestamp()
    .setFooter({ text: `SN Bump AI • Visibilidad: ${config.cooldownHours || 2}h` });

  if (config.embedBanner) bumpEmbed.setImage(config.embedBanner);

  // Botón "Unirse"
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setLabel('Unirse al Servidor').setStyle(ButtonStyle.Link).setURL(inviteUrl).setEmoji('🔗')
  );

  const globalMsg = await globalChannel.send({ embeds: [bumpEmbed], components: [row] });

  const cooldownHours = config.cooldownHours || 2;
  db.activeBumps[guildId] = { messageId: globalMsg.id, channelId: globalMsg.channel.id, expiresAt: Date.now() + (cooldownHours * 3600000) };
  
  db.stats.totalBumps = (db.stats.totalBumps || 0) + 1;
  db.stats.serverBumps[guildId] = (db.stats.serverBumps[guildId] || 0) + 1;
  db.dailyLimits[guildId].count++;
  saveDB();

  await logEvent(guildId, 'Bump Publicado', `Ejecutado por <@${user.id}>. Límite diario: ${db.dailyLimits[guildId].count}/${MAX_BUMPS_PER_DAY}`, '#2ECC71');
  return interaction.editReply({ content: `🚀 **Bump exitoso.** Visible en el canal global por ${cooldownHours}h.` });
}

// DEFINICIÓN DE COMANDOS SLASH
const commands = [
  new SlashCommandBuilder().setName('bump').setDescription('Promociona tu servidor en el canal global.'),
  
  new SlashCommandBuilder().setName('setup').setDescription('⚙️ Configuración rápida de todos los canales y roles.')
    .addRoleOption(o => o.setName('rol').setDescription('Rol para hacer bump').setRequired(true))
    .addChannelOption(o => o.setName('logs').setDescription('Canal de auditoría').setRequired(true))
    .addChannelOption(o => o.setName('avisos').setDescription('Canal de recordatorios').setRequired(true))
    .addStringOption(o => o.setName('plantilla').setDescription('Texto descriptivo de tu servidor').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder().setName('config-embed').setDescription('🎨 Personaliza el aspecto visual del anuncio.')
    .addStringOption(o => o.setName('color').setDescription('Código HEX del color (Ej: #FF5733)').setRequired(false))
    .addStringOption(o => o.setName('banner').setDescription('URL de la imagen inferior (terminada en .png o .jpg)').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder().setName('panel').setDescription('Crea un panel interactivo con botones en el canal actual.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    
  new SlashCommandBuilder().setName('plantilla-bump').setDescription('Configura solo el mensaje descriptivo.')
    .addStringOption(opt => opt.setName('descripcion').setDescription('Texto promocional').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder().setName('rol-bump').setDescription('Establece solo el rol permitido.')
    .addRoleOption(opt => opt.setName('rol').setDescription('Rol autorizado').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder().setName('cooldown').setDescription('Ajusta las horas de cooldown.')
    .addIntegerOption(o => o.setName('horas').setDescription('Duración en horas (1-24)').setMinValue(1).setMaxValue(24).setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder().setName('recordatorio').setDescription('Activa o desactiva las notificaciones.')
    .addBooleanOption(o => o.setName('estado').setDescription('¿Activar recordatorios?').setRequired(true))
    .addChannelOption(o => o.setName('canal').setDescription('Canal de avisos').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder().setName('config').setDescription('Muestra la configuración actual.'),
  new SlashCommandBuilder().setName('logs').setDescription('Configura canal de logs o visualiza historial.')
    .addChannelOption(o => o.setName('canal').setDescription('Canal para los logs').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder().setName('stats').setDescription('Estadísticas globales y locales.'),
  new SlashCommandBuilder().setName('ranking').setDescription('TOP 10 servidores con más bumps.'),
  new SlashCommandBuilder().setName('ping').setDescription('Latencia del bot.'),
  new SlashCommandBuilder().setName('invite').setDescription('Enlace de invitación.'),
  new SlashCommandBuilder().setName('help').setDescription('Panel de ayuda interactivo.'),
  new SlashCommandBuilder().setName('guia').setDescription('Guía rápida.'),
  new SlashCommandBuilder().setName('ia').setDescription('Consulta a Gemini IA.')
    .addStringOption(o => o.setName('pregunta').setDescription('Tu consulta').setRequired(true)),
  new SlashCommandBuilder().setName('traducir').setDescription('Traduce texto usando IA.')
    .addStringOption(o => o.setName('texto').setDescription('Texto original').setRequired(true))
    .addStringOption(o => o.setName('idioma').setDescription('Idioma destino').setRequired(true)),
  new SlashCommandBuilder().setName('blacklist').setDescription('Añade a la lista negra.')
    .addStringOption(o => o.setName('server_id').setDescription('ID').setRequired(true)).setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  new SlashCommandBuilder().setName('unblacklist').setDescription('Quita de la lista negra.')
    .addStringOption(o => o.setName('server_id').setDescription('ID').setRequired(true)).setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
].map(cmd => cmd.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

client.once('ready', async () => {
  console.log(`🤖 Bot conectado: ${client.user.tag}`);
  
  // Establecer Presencia / Estado
  client.user.setPresence({
    activities: [{ name: '/help | SN Bump AI', type: ActivityType.Watching }],
    status: 'online'
  });

  await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands });
  console.log('✅ Comandos registrados exitosamente.');
  checkExpiredBumps();
  setInterval(checkExpiredBumps, 60000);
});

client.on('interactionCreate', async interaction => {
  const { guildId, commandName } = interaction;

  if (db.blacklist.includes(guildId) && !['unblacklist'].includes(commandName) && interaction.isCommand()) {
    return interaction.reply({ content: '❌ Servidor en Lista Negra.', flags: 64 });
  }

  if (guildId && !db.configs[guildId]) {
    db.configs[guildId] = { cooldownHours: 2, remindersEnabled: true };
    saveDB();
  }

  // --- MANEJO DE COMPONENTES INTERACTIVOS ---
  if (interaction.isStringSelectMenu() && interaction.customId === 'help_menu') {
    const selected = interaction.values[0];
    let embed = new EmbedBuilder().setColor('#5865F2');

    if (selected === 'help_bump') {
      embed.setTitle('🚀 Comandos de Bump')
        .setDescription('`/bump` - Publica tu servidor en el canal global.\n`/setup` - Configuración inicial rápida.\n`/plantilla-bump` - Establece la descripción.\n`/rol-bump` - Configura el rol permitido.\n`/cooldown` - Ajusta el tiempo de espera.\n`/recordatorio` - Ajusta los avisos.\n`/config-embed` - Personaliza color y banner.');
    } else if (selected === 'help_ia') {
      embed.setTitle('🤖 Comandos de Inteligencia Artificial')
        .setDescription('`/ia [pregunta]` - Consulta rápida a Gemini.\n`/traducir [texto] [idioma]` - Traducción automática con IA.');
    } else if (selected === 'help_admin') {
      embed.setTitle('🛠️ Administración y Logs')
        .setDescription('`/config` - Consulta la configuración actual.\n`/panel` - Crea un panel de botones interactivo.\n`/logs [canal]` - Visualiza o configura el canal de logs.\n`/blacklist` y `/unblacklist` - Gestión de servidores bloqueados.');
    }
    return interaction.update({ embeds: [embed] });
  }

  // --- BOTONES DEL PANEL ---
  if (interaction.isButton()) {
    const id = interaction.customId;
    if (id === 'panel_bump') return executeBump(interaction);
    if (id === 'panel_guia') return interaction.reply({ content: '📖 **Guía:** \n1. Configura el bot usando `/setup` o `/plantilla-bump` y `/rol-bump`.\n2. Asegúrate de tener el rol asignado.\n3. Ejecuta `/bump` para promocionarte en el canal global.', flags: 64 });
    if (id === 'panel_stats') {
      const b = db.stats.serverBumps[guildId] || 0;
      return interaction.reply({ content: `📊 **Estadísticas Locales:**\nHas realizado **${b}** bumps desde este servidor.`, flags: 64 });
    }
  }

  if (!interaction.isChatInputCommand()) return;

  // --- HANDLERS DE COMANDOS ---

  if (commandName === 'bump') return executeBump(interaction);

  if (commandName === 'help') {
    const embed = new EmbedBuilder()
      .setTitle('🤖 Panel de Ayuda - SN Bump AI')
      .setDescription('Selecciona una categoría en el menú desplegable para ver los comandos disponibles o usa los botones para obtener soporte técnico.')
      .setColor('#5865F2');

    const row = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('help_menu')
        .setPlaceholder('Selecciona una categoría...')
        .addOptions([
          { label: 'Sistema de Bump', value: 'help_bump', emoji: '🚀' },
          { label: 'Funciones IA', value: 'help_ia', emoji: '🤖' },
          { label: 'Administración', value: 'help_admin', emoji: '🛠️' }
        ])
    );

    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel('Servidor de Soporte')
        .setStyle(ButtonStyle.Link)
        .setURL('https://discord.gg/2JxvC9Cngd')
        .setEmoji('🛟'),

      new ButtonBuilder()
        .setLabel('Invitar Bot')
        .setStyle(ButtonStyle.Link)
        .setURL(`https://discord.com/api/oauth2/authorize?client_id=${process.env.CLIENT_ID}&permissions=8&scope=bot%20applications.commands`)
        .setEmoji('➕')
    );

    return interaction.reply({ embeds: [embed], components: [row, buttons] });
  }

  if (commandName === 'setup') {
    const rol = interaction.options.getRole('rol');
    const logs = interaction.options.getChannel('logs');
    const avisos = interaction.options.getChannel('avisos');
    const plantilla = interaction.options.getString('plantilla');

    db.configs[guildId] = {
      ...db.configs[guildId], roleId: rol.id, logsChannelId: logs.id, reminderChannelId: avisos.id, template: plantilla
    };
    saveDB();
    await logEvent(guildId, 'Setup Completado', `Configuración general establecida por <@${interaction.user.id}>.`);
    return interaction.reply({ content: '✅ **¡Setup Exitoso!** El bot está completamente configurado y listo para usar.' });
  }

  if (commandName === 'plantilla-bump') {
    const descripcion = interaction.options.getString('descripcion');
    db.configs[guildId].template = descripcion;
    saveDB();
    return interaction.reply({ content: '✅ Plantilla descriptiva del servidor actualizada correctamente.' });
  }

  if (commandName === 'rol-bump') {
    const rol = interaction.options.getRole('rol');
    db.configs[guildId].roleId = rol.id;
    saveDB();
    return interaction.reply({ content: `✅ Rol autorizado actualizado a: <@&${rol.id}>` });
  }

  if (commandName === 'config-embed') {
    const color = interaction.options.getString('color');
    const banner = interaction.options.getString('banner');
    if (color) db.configs[guildId].embedColor = color;
    if (banner) db.configs[guildId].embedBanner = banner;
    saveDB();
    return interaction.reply({ content: '🎨 Configuración visual del embed actualizada.' });
  }

  if (commandName === 'cooldown') {
    const horas = interaction.options.getInteger('horas');
    db.configs[guildId].cooldownHours = horas; 
    saveDB();
    return interaction.reply({ content: `✅ Cooldown ajustado a **${horas} hora(s)**.` });
  }

  if (commandName === 'recordatorio') {
    const estado = interaction.options.getBoolean('estado');
    const canal = interaction.options.getChannel('canal');

    db.configs[guildId].remindersEnabled = estado;
    if (canal) db.configs[guildId].reminderChannelId = canal.id;
    saveDB();
    
    return interaction.reply({ content: `🔔 Recordatorios **${estado ? 'activados' : 'desactivados'}**${canal ? ` en el canal <#${canal.id}>` : ''}.` });
  }

  if (commandName === 'config') {
    const cfg = db.configs[guildId] || {};
    const embed = new EmbedBuilder()
      .setTitle(`⚙️ Configuración del Servidor: ${interaction.guild.name}`)
      .addFields(
        { name: '🎭 Rol Requerido', value: cfg.roleId ? `<@&${cfg.roleId}>` : '❌ No configurado', inline: true },
        { name: '⏳ Cooldown', value: `${cfg.cooldownHours || 2} hora(s)`, inline: true },
        { name: '🔔 Recordatorios', value: cfg.remindersEnabled !== false ? (cfg.reminderChannelId ? `<#${cfg.reminderChannelId}>` : 'Activados (Sin canal)') : '❌ Desactivados', inline: true },
        { name: '📝 Canal de Logs', value: cfg.logsChannelId ? `<#${cfg.logsChannelId}>` : '❌ No configurado', inline: true },
        { name: '🎨 Color Embed', value: cfg.embedColor || 'Predeterminado (#7289DA)', inline: true },
        { name: '📜 Plantilla', value: cfg.template || '❌ No configurada' }
      )
      .setColor('#3498db');
    return interaction.reply({ embeds: [embed] });
  }

  if (commandName === 'logs') {
    const canal = interaction.options.getChannel('canal');
    if (canal) {
      db.configs[guildId].logsChannelId = canal.id;
      saveDB();
      return interaction.reply({ content: `📝 Canal de auditoría/logs establecido a <#${canal.id}>.` });
    }

    const serverLogs = db.logs.filter(l => l.guildId === guildId).slice(-5).reverse();
    if (serverLogs.length === 0) return interaction.reply({ content: '📜 No hay logs registrados aún.', flags: 64 });

    const logList = serverLogs.map(l => `• **[${l.title}]**: ${l.description} _(<t:${Math.floor(new Date(l.timestamp).getTime() / 1000)}:R>)_`).join('\n');
    return interaction.reply({ embeds: [new EmbedBuilder().setTitle('📝 Últimos Registros de Logs').setDescription(logList).setColor('#3498db')], flags: 64 });
  }

  if (commandName === 'panel') {
    const embed = new EmbedBuilder().setTitle('🚀 Panel de Control - SN Bump AI').setDescription('Utiliza los botones a continuación para interactuar de forma rápida con el bot.').setColor('#2ECC71');
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('panel_bump').setLabel('BUMP').setStyle(ButtonStyle.Success).setEmoji('🚀'),
      new ButtonBuilder().setCustomId('panel_guia').setLabel('Guía').setStyle(ButtonStyle.Primary).setEmoji('📖'),
      new ButtonBuilder().setCustomId('panel_stats').setLabel('Estadísticas').setStyle(ButtonStyle.Secondary).setEmoji('📊')
    );
    await interaction.channel.send({ embeds: [embed], components: [row] });
    return interaction.reply({ content: '✅ Panel creado con éxito.', flags: 64 });
  }

  if (commandName === 'stats') {
    const totalGlobal = db.stats.totalBumps || 0;
    const totalLocal = db.stats.serverBumps[guildId] || 0;
    const activeCooldown = db.activeBumps[guildId];

    const embed = new EmbedBuilder()
      .setTitle('📊 Estadísticas de Bump')
      .addFields(
        { name: '🌐 Bumps Globales', value: `${totalGlobal}`, inline: true },
        { name: '🏠 Bumps de este Servidor', value: `${totalLocal}`, inline: true },
        { name: '⏳ Estado Local', value: activeCooldown ? `En Cooldown (${getFormattedTime(activeCooldown.expiresAt - Date.now())})` : '🟢 Disponible', inline: false }
      )
      .setColor('#9B59B6');

    return interaction.reply({ embeds: [embed] });
  }

  if (commandName === 'ranking') {
    const sorted = Object.entries(db.stats.serverBumps || {})
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10);

    if (sorted.length === 0) return interaction.reply({ content: '🏆 No hay datos suficientes para el ranking aún.' });

    let rankDesc = '';
    for (let i = 0; i < sorted.length; i++) {
      const [id, count] = sorted[i];
      const g = await client.guilds.fetch(id).catch(() => null);
      rankDesc += `**#${i + 1}** ${g ? g.name : `Servidor ID: ${id}`} — **${count}** bumps\n`;
    }

    const embed = new EmbedBuilder()
      .setTitle('🏆 TOP 10 Servidores con más Bumps')
      .setDescription(rankDesc)
      .setColor('#F1C40F');

    return interaction.reply({ embeds: [embed] });
  }

  if (commandName === 'guia') {
    const embed = new EmbedBuilder()
      .setTitle('📖 Guía de Inicio Rápido')
      .setDescription('Pasos necesarios para poner a funcionar SN Bump AI en tu servidor:')
      .addFields(
        { name: '1. Configuración Express', value: 'Ejecuta `/setup` asignando el rol autorizado, canal de logs, canal de avisos y el texto promocional.' },
        { name: '2. Personalización Visual', value: 'Usa `/config-embed` para definir una imagen o un color en Hexadecimal para destacar tu anuncio.' },
        { name: '3. Publicar Anuncio', value: 'Los miembros con el rol configurado pueden ejecutar `/bump` o usar el botón en el `/panel`.' }
      )
      .setColor('#1ABC9C');

    return interaction.reply({ embeds: [embed] });
  }

  if (commandName === 'invite') {
    const url = `https://discord.com/api/oauth2/authorize?client_id=${process.env.CLIENT_ID}&permissions=8&scope=bot%20applications.commands`;
    return interaction.reply({ content: `🔗 Puedes invitar al bot usando este enlace:\n${url}`, flags: 64 });
  }

  if (commandName === 'ping') {
    return interaction.reply({ content: `🏓 Latencia WS: \`${client.ws.ping}ms\``, flags: 64 });
  }

  // --- INTEGRACIÓN IA CON GEMINI ---
  if (commandName === 'ia') {
    await interaction.deferReply();
    try {
      const prompt = interaction.options.getString('pregunta');
      const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
      return interaction.editReply({ content: response.text.substring(0, 2000) });
    } catch (err) {
      console.error("Error en Gemini IA:", err);
      return interaction.editReply({ content: '⚠️ Ocurrió un error al procesar tu solicitud con la IA. Inténtalo más tarde.' });
    }
  }

  if (commandName === 'traducir') {
    await interaction.deferReply();
    try {
      const texto = interaction.options.getString('texto');
      const idioma = interaction.options.getString('idioma');
      const prompt = `Traduce el siguiente texto al idioma ${idioma}. Responde únicamente con el texto traducido sin explicaciones:\n\n${texto}`;
      
      const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
      return interaction.editReply({ content: `🌐 **Traducción (${idioma}):**\n${response.text.substring(0, 1900)}` });
    } catch (err) {
      console.error("Error al traducir:", err);
      return interaction.editReply({ content: '⚠️ Error al realizar la traducción con IA.' });
    }
  }

  // --- ADMINISTRACIÓN GLOBAL (BLACKLIST) ---
  if (commandName === 'blacklist') {
    const targetId = interaction.options.getString('server_id');
    if (!db.blacklist.includes(targetId)) {
      db.blacklist.push(targetId);
      saveDB();
    }
    return interaction.reply({ content: `🚫 Servidor \`${targetId}\` añadido a la lista negra.`, flags: 64 });
  }

  if (commandName === 'unblacklist') {
    const targetId = interaction.options.getString('server_id');
    db.blacklist = db.blacklist.filter(id => id !== targetId);
    saveDB();
    return interaction.reply({ content: `✅ Servidor \`${targetId}\` removido de la lista negra.`, flags: 64 });
  }
});

async function checkExpiredBumps() {
  const now = Date.now();
  for (const guildId in db.activeBumps) {
    const bumpInfo = db.activeBumps[guildId];
    if (now >= bumpInfo.expiresAt) {
      try {
        const globalChannel = await client.channels.fetch(GLOBAL_CHANNEL_ID).catch(() => null);
        if (globalChannel) {
          const msg = await globalChannel.messages.fetch(bumpInfo.messageId).catch(() => null);
          if (msg) await msg.delete().catch(() => {});
        }

        const config = db.configs[guildId] || {};
        if (config.remindersEnabled !== false) {
          let tChannel = config.reminderChannelId ? await client.channels.fetch(config.reminderChannelId).catch(()=>null) : null;
          if (tChannel && tChannel.permissionsFor(tChannel.guild.members.me).has(PermissionFlagsBits.SendMessages)) {
            await tChannel.send('🔔 **Cooldown Finalizado.** Ya puedes usar `/bump` nuevamente.');
          }
        }
        await logEvent(guildId, 'Bump Expirado', 'Retirado del canal global.');
      } catch (err) {}
      delete db.activeBumps[guildId]; saveDB();
    }
  }
}

client.login(process.env.DISCORD_TOKEN);
