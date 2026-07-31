const {
    EmbedBuilder
} = require('discord.js');


const cooldown = new Map();


module.exports = {

    name: 'messageCreate',


    async execute(message, client){


        if(!message.guild) return;
        if(message.author.bot) return;



        const config =
        client.dbQuery.getConfig.get(
            message.guild.id
        );


        if(
            config &&
            config.automod_enabled === 0
        ) return;



        let reason = null;



        // Invitaciones Discord

        const inviteRegex =
        /(discord\.gg|discord\.com\/invite)\/\w+/i;


        if(
            inviteRegex.test(
                message.content
            )
        ){

            reason =
            'Enlace de invitación no permitido';

        }



        // Spam de menciones

        if(
            message.mentions.users.size >= 5
        ){

            reason =
            'Spam de menciones';

        }



        // Spam rápido

        const key =
        message.author.id;


        const now =
        Date.now();



        if(
            cooldown.has(key)
        ){

            const last =
            cooldown.get(key);


            if(
                now - last < 2000
            ){

                reason =
                'Spam de mensajes';

            }

        }


        cooldown.set(
            key,
            now
        );



        if(!reason) return;



        try{

            await message.delete();



            const warn =
            client.dbQuery.getWarns.get(
                message.guild.id,
                message.author.id
            );


            const warns =
            (warn?.warns || 0) + 1;



            client.dbQuery.setWarns.run(

                message.guild.id,
                message.author.id,
                warns

            );



            const embed =
            new EmbedBuilder()

            .setColor('#ed4245')

            .setTitle('🛡️ AutoMod activado')

            .setDescription(

            `Usuario: ${message.author}\n`+
            `Motivo: **${reason}**\n`+
            `Advertencias: **${warns}/8**`

            )

            .setTimestamp();



            await message.channel.send({

                embeds:[
                    embed
                ]

            });



            // Mute automático

            if(
                warns >= 3
            ){

                await message.member.timeout(
                    60 * 60 * 1000,
                    'AutoMod: acumulación de faltas'
                );

            }



            // Kick automático

            if(
                warns >= 4
            ){

                await message.member.kick(
                    'AutoMod: demasiadas advertencias'
                );

            }



        }catch(err){

            console.log(
                'Error AutoMod:',
                err
            );

        }


    }

};
