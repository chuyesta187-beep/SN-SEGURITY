const {
    EmbedBuilder
} = require('discord.js');


const joins = new Map();


module.exports = {

    name: 'guildMemberAdd',


    async execute(member, client){


        const guild =
        member.guild;



        const config =
        client.dbQuery.getConfig.get(
            guild.id
        );



        if(
            config &&
            config.antiraid_enabled === 0
        ) return;



        const now =
        Date.now();



        if(
            !joins.has(guild.id)
        ){

            joins.set(
                guild.id,
                []
            );

        }



        let data =
        joins.get(
            guild.id
        );



        // Ventana de 10 segundos

        data =
        data.filter(
            time =>
            now - time < 10000
        );



        data.push(
            now
        );


        joins.set(
            guild.id,
            data
        );



        const count =
        data.length;



        if(
            count >= 5
        ){


            const embed =
            new EmbedBuilder()

            .setColor('#fee75c')

            .setTitle('🚨 Posible Raid detectado')

            .setDescription(

            `Servidor: **${guild.name}**\n`+
            `Nuevos usuarios: **${count}** en 10 segundos`

            )

            .setTimestamp();



            console.log(
                `[ANTI-RAID] ${guild.name}: ${count} entradas`
            );



            if(
                config?.log_channel_id
            ){

                const log =
                guild.channels.cache.get(
                    config.log_channel_id
                );


                if(log){

                    log.send({

                        embeds:[
                            embed
                        ]

                    });

                }

            }



        }



        // Nivel crítico

        if(
            count >= 15
        ){


            guild.systemChannel?.send({

                embeds:[

                    new EmbedBuilder()

                    .setColor('#ed4245')

                    .setTitle('🔒 LOCKDOWN ANTI-RAID')

                    .setDescription(
                        'Se detectó una oleada masiva de entradas.'
                    )

                ]

            });


        }


    }

};
