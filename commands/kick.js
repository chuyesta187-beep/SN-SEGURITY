const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    EmbedBuilder
} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Expulsa un usuario del servidor.')
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)

        .addUserOption(option =>
            option
                .setName('usuario')
                .setDescription('Usuario a expulsar.')
                .setRequired(true)
        )

        .addStringOption(option =>
            option
                .setName('motivo')
                .setDescription('Motivo de la expulsión.')
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


        const dmEmbed = new EmbedBuilder()
            .setColor('#fee75c')
            .setTitle('🛡️ SN SECURITY | Expulsión')
            .setDescription(
                `Has sido expulsado de **${interaction.guild.name}**`
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


        await member.kick(motivo);


        const logEmbed = new EmbedBuilder()
            .setColor('#fee75c')
            .setTitle('👢 Usuario Expulsado')
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
            content: `👢 ${user.tag} fue expulsado correctamente.`,
            ephemeral: true
        });
    }
};
