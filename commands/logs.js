const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    EmbedBuilder,
    ChannelType
} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('logs')
        .setDescription('Administra el sistema de logs.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)

        .addSubcommand(sub =>
            sub
                .setName('configurar')
                .setDescription('Configura el canal de logs.')
                .addChannelOption(option =>
                    option
                        .setName('canal')
                        .setDescription('Canal donde llegarán los registros.')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true)
                )
        )

        .addSubcommand(sub =>
            sub
                .setName('estado')
                .setDescription('Muestra la configuración actual de logs.')
        ),

    async execute(interaction) {

        const sub = interaction.options.getSubcommand();

        if (sub === 'configurar') {

            const canal = interaction.options.getChannel('canal');

            interaction.client.dbQuery.setConfigChannel.run(
                interaction.guild.id,
                canal.id
            );

            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#57f287')
                        .setTitle('📜 Sistema de Logs Activado')
                        .setDescription(
                            `Los registros serán enviados a ${canal}.`
                        )
                        .setTimestamp()
                ],
                ephemeral: true
            });
        }


        if (sub === 'estado') {

            const config =
                interaction.client.dbQuery.getConfig.get(
                    interaction.guild.id
                );

            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#2b2d31')
                        .setTitle('📜 Estado de Logs')
                        .addFields({
                            name: 'Canal',
                            value: config?.log_channel_id
                                ? `<#${config.log_channel_id}>`
                                : '❌ No configurado'
                        })
                        .setTimestamp()
                ],
                ephemeral: true
            });
        }
    }
};
