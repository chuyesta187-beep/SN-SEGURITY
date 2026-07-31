const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    AttachmentBuilder
} = require('discord.js');


module.exports = {

    data: new SlashCommandBuilder()

        .setName('backup')
        .setDescription('Crea un respaldo de la configuración de SN SECURITY.')
        .setDefaultMemberPermissions(
            PermissionFlagsBits.Administrator
        ),



    async execute(interaction){


        const guild =
            interaction.guild;


        const data = {


            servidor:{
                id:guild.id,
                nombre:guild.name,
                fecha:new Date().toISOString()
            },


            roles:
                guild.roles.cache
                .filter(r=>r.id !== guild.id)
                .map(r=>({

                    id:r.id,
                    nombre:r.name,
                    color:r.hexColor

                })),


            canales:
                guild.channels.cache
                .map(c=>({

                    id:c.id,
                    nombre:c.name,
                    tipo:c.type

                })),


            miembros:
                guild.memberCount

        };



        const file =
            Buffer.from(
                JSON.stringify(
                    data,
                    null,
                    4
                )
            );



        const attachment =
            new AttachmentBuilder(
                file,
                {
                    name:
                    `SN-backup-${guild.id}.json`
                }
            );



        await interaction.reply({

            content:
            '✅ Backup creado correctamente.',

            files:[
                attachment
            ],

            ephemeral:true

        });


    }

};
