const {
    EmbedBuilder
} = require('discord.js');


module.exports = {


    success(title, description){

        return new EmbedBuilder()

        .setColor('#57f287')

        .setTitle(`✅ ${title}`)

        .setDescription(description)

        .setTimestamp();

    },



    error(title, description){

        return new EmbedBuilder()

        .setColor('#ed4245')

        .setTitle(`❌ ${title}`)

        .setDescription(description)

        .setTimestamp();

    },



    warning(title, description){

        return new EmbedBuilder()

        .setColor('#fee75c')

        .setTitle(`⚠️ ${title}`)

        .setDescription(description)

        .setTimestamp();

    },



    security(title, description){

        return new EmbedBuilder()

        .setColor('#5865f2')

        .setTitle(`🛡️ ${title}`)

        .setDescription(description)

        .setFooter({
            text:'SN SECURITY v6.0'
        })

        .setTimestamp();

    }



};
