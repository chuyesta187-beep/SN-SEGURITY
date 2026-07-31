const {
    EmbedBuilder
} = require('discord.js');


module.exports = {

    name: 'messageDelete',

    async execute(message, client) {

        if(!message.guild) return;
        if(message.author?.bot) return;


        const config =
        client.dbQuery.getConfig.get(
            message.guild.id
        );


        if(!config?.log_channel_id) return;


        const channel =
        message.guild.channels.cache.get(
            config.log_channel_id
        );


        if(!channel) return;



        const embed =
        new EmbedBuilder()

        .setColor('#fee75c')

        .setTitle('🗑️ Mensaje eliminado')

        .addFields(

            {
                name:'👤 Usuario',
                value:
                message.author ?
                message.author.tag :
                'Desconocido'
            },

            {
                name:'📍 Canal',
                value:
                `<#${message.channel.id}>`
            },

            {
                name:'💬 Contenido',
                value:
                message.content ||
                'Sin contenido'
            }

        )

        .setTimestamp();



        channel.send({
            embeds:[embed]
        });

    }

};
