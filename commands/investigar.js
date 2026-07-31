const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    EmbedBuilder
} = require('discord.js');


module.exports = {

    data: new SlashCommandBuilder()
        .setName('investigar')
        .setDescription('Investiga el historial de un usuario.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)

        .addUserOption(option =>
            option
                .setName('usuario')
                .setDescription('Usuario a investigar.')
                .setRequired(true)
        ),



    async execute(interaction){


        const user =
            interaction.options.getUser('usuario');


        const db =
            interaction.client.db;


        const warns =
            interaction.client.dbQuery.getWarns.get(
                interaction.guild.id,
                user.id
            );


        const blacklist =
            db.prepare(`
                SELECT *
                FROM global_blacklist
                WHERE user_id = ?
            `)
            .get(user.id);



        const member =
            await interaction.guild.members.fetch(user.id)
            .catch(()=>null);



        const embed =
            new EmbedBuilder()
            .setColor(
                blacklist
                ? '#ed4245'
                : '#57f287'
            )
            .setTitle('🔎 Investigación de Usuario')
            .setThumbnail(user.displayAvatarURL())

            .addFields(

                {
                    name:'👤 Usuario',
                    value:`${user.tag}\n${user.id}`
                },

                {
                    name:'⚠️ Warns',
                    value:
                    `${warns?.warns || 0}/8`
                },

                {
                    name:'🚫 Blacklist',
                    value:
                    blacklist
                    ? `❌ Sí\n${blacklist.reason}`
                    : '✅ No'
                },

                {
                    name:'📅 Cuenta creada',
                    value:
                    `<t:${Math.floor(user.createdTimestamp/1000)}:R>`
                },

                {
                    name:'🏠 En servidor',
                    value:
                    member
                    ? '✅ Sí'
                    : '❌ No'
                }

            )

            .setTimestamp();



        return interaction.reply({

            embeds:[embed],

            ephemeral:true

        });

    }

};
