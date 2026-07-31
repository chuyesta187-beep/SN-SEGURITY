const {
    AuditLogEvent,
    EmbedBuilder
} = require('discord.js');


const actions = new Map();


module.exports = {

    name: 'antiNuke',


    async track(guild, user, type, client){


        if(
            user.bot ||
            user.id === guild.ownerId
        ) return;



        const key =
        `${guild.id}-${user.id}`;



        if(
            !actions.has(key)
        ){

            actions.set(
                key,
                {}
            );

        }



        const data =
        actions.get(key);



        if(
            !data[type]
        ){

            data[type] = [];

        }



        const now =
        Date.now();



        data[type] =
        data[type].filter(
            t =>
            now - t < 60000
        );


        data[type].push(
            now
        );


        actions.set(
            key,
            data
        );



        const amount =
        data[type].length;



        // Límites

        let limit = 10;


        if(type === 'roles')
            limit = 8;


        if(type === 'bans')
            limit = 5;



        if(
            amount >= limit
        ){


            const member =
            await guild.members
            .fetch(user.id)
            .catch(() => null);



            if(member){


                await member.ban({

                    reason:
                    `🛡️ AntiNuke: abuso de ${type}`

                }).catch(()=>{});



                const embed =
                new EmbedBuilder()

                .setColor('#ed4245')

                .setTitle('💥 AntiNuke ACTIVADO')

                .setDescription(

                `Usuario bloqueado:\n${user.tag}\n\n`+
                `Acción detectada:\n**${type}**\n\n`+
                `Cantidad:\n**${amount}**`

                )

                .setTimestamp();



                const config =
                client.dbQuery.getConfig.get(
                    guild.id
                );


                if(
                    config?.log_channel_id
                ){

                    const log =
                    guild.channels.cache.get(
                        config.log_channel_id
                    );


                    log?.send({

                        embeds:[
                            embed
                        ]

                    });

                }

            }

        }

    }

};
