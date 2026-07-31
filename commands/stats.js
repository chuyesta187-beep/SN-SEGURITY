const {
    SlashCommandBuilder,
    EmbedBuilder
} = require('discord.js');


module.exports = {

    data: new SlashCommandBuilder()
        .setName('stats')
        .setDescription('Muestra estadísticas de SN SECURITY.'),



    async execute(interaction){


        const client =
            interaction.client;


        const ping =
            client.ws.ping;


        const embed =
            new EmbedBuilder()
            .setColor('#2b2d31')
            .setTitle('🛡️ SN SECURITY | Estadísticas')

            .addFields(

                {
                    name:'🌐 Servidores',
                    value:
                    `${client.guilds.cache.size}`,
                    inline:true
                },

                {
                    name:'👥 Usuarios protegidos',
                    value:
                    `${client.users.cache.size}`,
                    inline:true
                },

                {
                    name:'📡 Ping',
                    value:
                    `${ping}ms`,
                    inline:true
                },

                {
                    name:'💾 Base de datos',
                    value:
                    '✅ SQLite Online',
                    inline:true
                },

                {
                    name:'🤖 Versión',
                    value:
                    'SN SECURITY v6.0',
                    inline:true
                },

                {
                    name:'🛡️ Sistemas',
                    value:
`
✅ AutoMod
✅ AntiRaid
✅ AntiNuke
✅ Logs
✅ Tickets
`,
                    inline:false
                }

            )

            .setTimestamp();



        return interaction.reply({

            embeds:[embed]

        });

    }

};
