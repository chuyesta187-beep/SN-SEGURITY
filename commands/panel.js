const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');

module.exports = {

    data: new SlashCommandBuilder()
        .setName('panel')
        .setDescription('Envía el panel de apelaciones.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),


    async execute(interaction) {


        const embed = new EmbedBuilder()
            .setColor('#2b2d31')
            .setTitle('🎫 SN SECURITY | Apelaciones')
            .setDescription(
                `¿Crees que una sanción fue incorrecta?\n\n` +
                `Usa los botones de abajo para crear una apelación.\n\n` +
                `🛡️ El Staff revisará tu caso con las evidencias correspondientes.`
            )
            .setFooter({
                text:'SN SECURITY v6.0'
            })
            .setTimestamp();



        const buttons = new ActionRowBuilder()
            .addComponents(

                new ButtonBuilder()
                    .setCustomId('appeal_ban')
                    .setLabel('Apelar Ban')
                    .setEmoji('🔨')
                    .setStyle(ButtonStyle.Danger),

                new ButtonBuilder()
                    .setCustomId('appeal_mute')
                    .setLabel('Apelar Mute')
                    .setEmoji('🔇')
                    .setStyle(ButtonStyle.Primary),

                new ButtonBuilder()
                    .setCustomId('appeal_other')
                    .setLabel('Otro Caso')
                    .setEmoji('🎫')
                    .setStyle(ButtonStyle.Secondary)

            );



        await interaction.channel.send({
            embeds:[embed],
            components:[buttons]
        });



        return interaction.reply({
            content:'✅ Panel de apelaciones enviado.',
            ephemeral:true
        });

    }
};
