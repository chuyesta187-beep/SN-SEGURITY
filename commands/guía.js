const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');


module.exports = {

    data: new SlashCommandBuilder()
        .setName('guia')
        .setDescription('Muestra toda la información de SN SECURITY.'),


    async execute(interaction) {


        const embed = new EmbedBuilder()
            .setColor('#2b2d31')
            .setTitle('🛡️ SN SECURITY v6.0 | Guía')
            .setDescription(
                `Sistema global de seguridad para **STEAL NATION**\n\n` +
                `Selecciona una categoría para ver información.`
            )
            .addFields(

                {
                    name:'🤖 AutoMod',
                    value:
                    'Protección automática contra spam, links e infracciones.'
                },

                {
                    name:'🚨 AntiRaid',
                    value:
                    'Detecta entradas masivas y ataques al servidor.'
                },

                {
                    name:'🛡️ AntiNuke',
                    value:
                    'Protección contra eliminación masiva de canales y roles.'
                },

                {
                    name:'🎫 Tickets',
                    value:
                    'Sistema de apelaciones con acceso al Staff.'
                }

            )
            .setTimestamp();



        const row = new ActionRowBuilder()
            .addComponents(

                new ButtonBuilder()
                    .setCustomId('guide_commands')
                    .setLabel('Comandos')
                    .setEmoji('📚')
                    .setStyle(ButtonStyle.Primary),


                new ButtonBuilder()
                    .setCustomId('guide_security')
                    .setLabel('Seguridad')
                    .setEmoji('🛡️')
                    .setStyle(ButtonStyle.Danger),


                new ButtonBuilder()
                    .setCustomId('guide_staff')
                    .setLabel('Staff')
                    .setEmoji('👮')
                    .setStyle(ButtonStyle.Secondary)

            );



        await interaction.reply({
            embeds:[embed],
            components:[row]
        });

    },


    async handleButton(interaction){

        let embed;


        if(interaction.customId === 'guide_commands'){

            embed = new EmbedBuilder()
                .setColor('#5865f2')
                .setTitle('📚 Comandos SN SECURITY')
                .setDescription(
`
🔨 Moderación
\`/ban\`
\`/kick\`
\`/mute\`
\`/warn\`
\`/clear\`

⚙️ Configuración
\`/config\`
\`/logs\`
\`/staff\`

🎫 Sistema
\`/panel\`
\`/guia\`
`
                );

        }



        if(interaction.customId === 'guide_security'){

            embed = new EmbedBuilder()
                .setColor('#ed4245')
                .setTitle('🛡️ Seguridad')
                .setDescription(
`
✅ AutoMod
✅ AntiRaid
✅ AntiNuke
✅ Logs completos
✅ Protección automática
`
                );

        }



        if(interaction.customId === 'guide_staff'){

            embed = new EmbedBuilder()
                .setColor('#57f287')
                .setTitle('👮 Sistema Staff')
                .setDescription(
`
Los roles configurados con:

/staff rol añadir

pueden acceder a:

🎫 Tickets
📜 Apelaciones
🔎 Casos
`
                );

        }



        if(embed){

            return interaction.update({
                embeds:[embed]
            });

        }

    }

};
