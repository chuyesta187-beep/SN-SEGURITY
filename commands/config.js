const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    EmbedBuilder,
    ChannelType
} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('config')
        .setDescription('Configura los sistemas de SN SECURITY.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)

        .addSubcommand(sub =>
            sub
                .setName('logs')
                .setDescription('Configura el canal de logs.')
                .addChannelOption(option =>
                    option
                        .setName('canal')
                        .setDescription('Canal donde se enviarán los logs.')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true)
                )
        )

        .addSubcommand(sub =>
            sub
                .setName('apelaciones')
                .setDescription('Configura el canal de apelaciones.')
                .addChannelOption(option =>
                    option
                        .setName('canal')
                        .setDescription('Canal de apelaciones.')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true)
                )
        ),

    async execute(interaction) {

        const sub = interaction.options.getSubcommand();
        const canal = interaction.options.getChannel('canal');

        if (sub === 'logs') {

            interaction.client.dbQuery.setConfigChannel.run(
                interaction.guild.id,
                canal.id
            );

            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#57f287')
                        .setTitle('📜 Logs configurados')
                        .setDescription(`Los logs serán enviados a ${canal}`)
                ],
                ephemeral: true
            });
        }

        if (sub === 'apelaciones') {

            interaction.client.db.prepare(`
                INSERT INTO guild_config 
                (guild_id, appeal_channel_id)
                VALUES (?, ?)
                ON CONFLICT(guild_id)
                DO UPDATE SET appeal_channel_id = excluded.appeal_channel_id
            `).run(
                interaction.guild.id,
                canal.id
            );

            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#57f287')
                        .setTitle('🎫 Apelaciones configuradas')
                        .setDescription(`Canal asignado: ${canal}`)
                ],
                ephemeral: true
            });
        }
    }
};
