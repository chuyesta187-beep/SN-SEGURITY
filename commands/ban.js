const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    EmbedBuilder
} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Banea un usuario del servidor.')
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)

        .addUserOption(option =>
            option
                .setName('usuario')
                .setDescription('Usuario a banear.')
                .setRequired(true)
        )

        .addStringOption(option =>
            option
                .setName('motivo')
                .setDescription('Motivo del baneo.')
                .setRequired(true)
        ),

    async execute(interaction) {

        const user = interaction.options.getUser('usuario');
        const motivo = interaction.options.getString('motivo');

        const member = await interaction.guild.members.fetch(user.id)
            .catch(() => null);

        if (!member) {
            return interaction.reply({
                content: '❌ Usuario no encontrado.',
                ephemeral: true
            });
        }


        // MD al usuario
        const dmEmbed = new EmbedBuilder()
            .setColor('#ed4245')
            .setTitle('🛡️ SN SECURITY | Baneo')
            .setDescription(
                `Has sido baneado de **${interaction.guild.name}**`
            )
            .addFields(
                {
                    name: 'Motivo',
                    value: motivo
                },
                {
                    name: 'Moderador',
                    value: interaction.user.tag
                }
            )
            .setTimestamp();


        await user.send({
            embeds: [dmEmbed]
        }).catch(() => {});


        // Aplicar ban
        await member.ban({
            reason: motivo
        });


        // Logs
        const logEmbed = new EmbedBuilder()
            .setColor('#ed4245')
            .setTitle('🔨 Usuario Baneado')
            .addFields(
                {
                    name: 'Usuario',
                    value: `${user.tag} (${user.id})`
                },
                {
                    name: 'Staff',
                    value: interaction.user.tag
                },
                {
                    name: 'Motivo',
                    value: motivo
                }
            )
            .setTimestamp();


        const config =
            interaction.client.dbQuery.getConfig.get(
                interaction.guild.id
            );


        if (config?.log_channel_id) {
            const logChannel =
                interaction.guild.channels.cache.get(
                    config.log_channel_id
                );

            if (logChannel) {
                logChannel.send({
                    embeds: [logEmbed]
                });
            }
        }


        return interaction.reply({
            content: `🔨 ${user.tag} fue baneado correctamente.`,
            ephemeral: true
        });
    }
};
