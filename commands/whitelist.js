const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    EmbedBuilder
} = require('discord.js');


module.exports = {

    data: new SlashCommandBuilder()

        .setName('whitelist')
        .setDescription('Gestiona usuarios protegidos.')
        .setDefaultMemberPermissions(
            PermissionFlagsBits.Administrator
        )

        .addSubcommand(sub =>
            sub
            .setName('añadir')
            .setDescription('Añade un usuario protegido.')
            .addUserOption(opt =>
                opt
                .setName('usuario')
                .setDescription('Usuario.')
                .setRequired(true)
            )
        )

        .addSubcommand(sub =>
            sub
            .setName('quitar')
            .setDescription('Quita un usuario protegido.')
            .addUserOption(opt =>
                opt
                .setName('usuario')
                .setDescription('Usuario.')
                .setRequired(true)
            )
        )

        .addSubcommand(sub =>
            sub
            .setName('lista')
            .setDescription('Muestra usuarios protegidos.')
        ),



    async execute(interaction){


        const db =
        interaction.client.db;


        const sub =
        interaction.options.getSubcommand();



        if(sub === 'añadir'){


            const user =
            interaction.options.getUser('usuario');


            db.prepare(`

            CREATE TABLE IF NOT EXISTS whitelist (

                guild_id TEXT,
                user_id TEXT,
                PRIMARY KEY(guild_id,user_id)

            )

            `).run();



            db.prepare(`

            INSERT OR IGNORE INTO whitelist

            VALUES (?,?)

            `).run(
                interaction.guild.id,
                user.id
            );



            return interaction.reply({

                content:
                `🛡️ ${user.tag} añadido a la whitelist.`,

                ephemeral:true

            });

        }



        if(sub === 'quitar'){


            const user =
            interaction.options.getUser('usuario');



            db.prepare(`

            DELETE FROM whitelist

            WHERE guild_id=? AND user_id=?

            `).run(
                interaction.guild.id,
                user.id
            );



            return interaction.reply({

                content:
                `🗑️ ${user.tag} eliminado de la whitelist.`,

                ephemeral:true

            });

        }



        if(sub === 'lista'){


            const users =
            db.prepare(`

            SELECT user_id FROM whitelist

            WHERE guild_id=?

            `)
            .all(
                interaction.guild.id
            );



            const lista =
            users.length ?

            users.map(u =>
            `<@${u.user_id}>`
            ).join('\n')

            :

            'No hay usuarios protegidos.';



            const embed =
            new EmbedBuilder()

            .setColor('#2b2d31')

            .setTitle('🛡️ Whitelist SN SECURITY')

            .setDescription(lista);



            return interaction.reply({

                embeds:[embed],

                ephemeral:true

            });

        }

    }

};
