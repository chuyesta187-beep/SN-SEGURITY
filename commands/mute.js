const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    EmbedBuilder
} = require('discord.js');

module.exports = {

    data: new SlashCommandBuilder()
        .setName('mute')
        .setDescription('Silencia un usuario temporalmente.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)

        .addUserOption(option =>
            option
                .setName('usuario')
                .setDescription('Usuario a silenciar.')
                .setRequired(true)
        )

        .addIntegerOption(option =>
            option
                .setName('tiempo')
                .setDescription('Tiempo en minutos.')
                .setRequired(true)
        )

        .addStringOption(option =>
            option
                .setName('motivo')
                .setDescription('Motivo del mute.')
                .setRequired(true)
        ),


    async execute(interaction) {

        const user = interaction.options.getUser('usuario');
        const tiempo = interaction.options.getInteger('tiempo');
        const motivo = interaction.options.getString('motivo');


        const member = await interaction.guild.members.fetch(user.id)
            .catch(() => null);


        if (!member) {
            return interaction.reply({
                content: '❌ Usuario no encontrado.',
                ephemeral: true
            });
        }


        const tiempoMs = tiempo * 60 * 1000;


        await member.timeout(
            tiempoMs,
            motivo
        );


        const dmEmbed = new EmbedBuilder()
            .setColor('#fee75c')
            .setTitle('🔇 SN SECURITY | Mute')
            .setDescription(
                `Has recibido un silencio temporal en **${interaction.guild.name}**`
            )
            .addFields(
                {
                    name: 'Duración',
                    value: `${tiempo} minutos`
                },
                {
                    name: 'Motivo',
                    value: motivo
                },
                {
                    name: 'Staff',
                    value: interaction.user.tag
                }
            )
            .setTimestamp();


        await user.send({
            embeds: [dmEmbed]
        }).catch(() => {});


        const logEmbed = new EmbedBuilder()
            .setColor('#fee75c')
            .setTitle('🔇 Usuario Silenciado')
            .addFields(
                {
                    name: 'Usuario',
                    value: `${user.tag} (${user.id})`
                },
                {
                    name: 'Duración',
                    value: `${tiempo} minutos`
                },
                {
                    name: 'Motivo',
                    value: motivo
                },
                {
                    name: 'Staff',
                    value: interaction.user.tag
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
            content: `🔇 ${user.tag} fue silenciado por ${tiempo} minutos.`,
            ephemeral: true
        });

    }
};
