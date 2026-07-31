const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    EmbedBuilder
} = require('discord.js');

module.exports = {

    data: new SlashCommandBuilder()
        .setName('clear')
        .setDescription('Elimina mensajes del canal.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)

        .addIntegerOption(option =>
            option
                .setName('cantidad')
                .setDescription('Cantidad de mensajes a borrar.')
                .setRequired(true)
        ),


    async execute(interaction) {

        const cantidad =
            interaction.options.getInteger('cantidad');


        if (cantidad < 1 || cantidad > 100) {

            return interaction.reply({
                content:'❌ La cantidad debe ser entre 1 y 100.',
                ephemeral:true
            });

        }


        const deleted =
            await interaction.channel.bulkDelete(
                cantidad,
                true
            );


        const embed = new EmbedBuilder()
            .setColor('#57f287')
            .setTitle('🧹 Mensajes eliminados')
            .addFields(
                {
                    name:'Cantidad',
                    value:`${deleted.size}`
                },
                {
                    name:'Staff',
                    value:interaction.user.tag
                },
                {
                    name:'Canal',
                    value:interaction.channel.toString()
                }
            )
            .setTimestamp();



        const config =
            interaction.client.dbQuery.getConfig.get(
                interaction.guild.id
            );


        if(config?.log_channel_id){

            const logChannel =
                interaction.guild.channels.cache.get(
                    config.log_channel_id
                );


            if(logChannel){

                logChannel.send({
                    embeds:[embed]
                });

            }

        }



        return interaction.reply({
            content:`🧹 ${deleted.size} mensajes eliminados.`,
            ephemeral:true
        });

    }
};
