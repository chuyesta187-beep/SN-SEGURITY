const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    EmbedBuilder
} = require('discord.js');


module.exports = {

    data: new SlashCommandBuilder()

        .setName('config')
        .setDescription('Configura SN SECURITY.')
        .setDefaultMemberPermissions(
            PermissionFlagsBits.Administrator
        )

        .addSubcommand(sub =>
            sub
            .setName('logs')
            .setDescription('Configura el canal de logs.')
            .addChannelOption(opt =>
                opt
                .setName('canal')
                .setDescription('Canal de logs.')
                .setRequired(true)
            )
        )

        .addSubcommand(sub =>
            sub
            .setName('sistema')
            .setDescription('Activa o desactiva sistemas.')
            .addStringOption(opt =>
                opt
                .setName('nombre')
                .setDescription('Sistema.')
                .setRequired(true)
                .addChoices(
                    {
                        name:'AutoMod',
                        value:'automod_enabled'
                    },
                    {
                        name:'AntiRaid',
                        value:'antiraid_enabled'
                    },
                    {
                        name:'AntiNuke',
                        value:'antinuke_enabled'
                    }
                )
            )

            .addBooleanOption(opt =>
                opt
                .setName('estado')
                .setDescription('Estado.')
                .setRequired(true)
            )
        ),



    async execute(interaction){


        const db =
        interaction.client.dbQuery;


        const sub =
        interaction.options.getSubcommand();



        if(sub === 'logs'){


            const canal =
            interaction.options.getChannel('canal');


            db.setConfigChannel.run(
                interaction.guild.id,
                canal.id
            );


            return interaction.reply({

                content:
                `✅ Canal de logs configurado: ${canal}`,

                ephemeral:true

            });

        }



        if(sub === 'sistema'){


            const sistema =
            interaction.options.getString('nombre');


            const estado =
            interaction.options.getBoolean('estado');


            const query = `

            INSERT INTO guild_config
            (guild_id, ${sistema})

            VALUES (?,?)

            ON CONFLICT(guild_id)
            DO UPDATE SET ${sistema}=excluded.${sistema}

            `;


            interaction.client.db
            .prepare(query)
            .run(
                interaction.guild.id,
                estado ? 1 : 0
            );



            const embed =
            new EmbedBuilder()

            .setColor('#57f287')

            .setTitle('⚙️ Configuración actualizada')

            .setDescription(
                `Sistema: **${sistema}**\nEstado: **${estado ? 'Activado ✅':'Desactivado ❌'}**`
            );



            return interaction.reply({

                embeds:[embed],

                ephemeral:true

            });

        }

    }

};
