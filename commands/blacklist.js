const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    EmbedBuilder
} = require('discord.js');


module.exports = {

    data: new SlashCommandBuilder()
        .setName('blacklist')
        .setDescription('Gestiona la lista negra global.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)

        .addSubcommand(sub =>
            sub
                .setName('añadir')
                .setDescription('Añade un usuario a la blacklist.')
                .addUserOption(option =>
                    option
                        .setName('usuario')
                        .setDescription('Usuario a bloquear.')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName('razon')
                        .setDescription('Razón del bloqueo.')
                        .setRequired(true)
                )
        )


        .addSubcommand(sub =>
            sub
                .setName('quitar')
                .setDescription('Quita un usuario de la blacklist.')
                .addUserOption(option =>
                    option
                        .setName('usuario')
                        .setDescription('Usuario a retirar.')
                        .setRequired(true)
                )
        )


        .addSubcommand(sub =>
            sub
                .setName('ver')
                .setDescription('Verifica un usuario.')
                .addUserOption(option =>
                    option
                        .setName('usuario')
                        .setDescription('Usuario a revisar.')
                        .setRequired(true)
                )
        ),



    async execute(interaction){


        const sub =
            interaction.options.getSubcommand();


        const db = interaction.client.db;



        if(sub === 'añadir'){

            const user =
                interaction.options.getUser('usuario');

            const razon =
                interaction.options.getString('razon');


            db.prepare(`
                INSERT OR REPLACE INTO global_blacklist
                (user_id, reason)
                VALUES (?,?)
            `).run(
                user.id,
                razon
            );


            return interaction.reply({

                embeds:[
                    new EmbedBuilder()
                    .setColor('#ed4245')
                    .setTitle('🚫 Usuario añadido')
                    .setDescription(
                        `${user.tag} fue añadido a la blacklist.\n\nMotivo: ${razon}`
                    )
                ],

                ephemeral:true
            });

        }



        if(sub === 'quitar'){

            const user =
                interaction.options.getUser('usuario');


            db.prepare(`
                DELETE FROM global_blacklist
                WHERE user_id = ?
            `)
            .run(user.id);



            return interaction.reply({

                content:
                `✅ ${user.tag} eliminado de la blacklist.`,

                ephemeral:true

            });

        }




        if(sub === 'ver'){

            const user =
                interaction.options.getUser('usuario');


            const data =
                db.prepare(`
                    SELECT * FROM global_blacklist
                    WHERE user_id = ?
                `)
                .get(user.id);



            return interaction.reply({

                embeds:[
                    new EmbedBuilder()
                    .setColor(data ? '#ed4245':'#57f287')
                    .setTitle('🚫 Estado Blacklist')
                    .setDescription(
                        data
                        ? `❌ Bloqueado\nMotivo: ${data.reason}`
                        : '✅ Usuario limpio'
                    )
                ],

                ephemeral:true
            });

        }

    }

};
