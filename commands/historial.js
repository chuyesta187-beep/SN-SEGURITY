const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    EmbedBuilder
} = require('discord.js');


module.exports = {

    data: new SlashCommandBuilder()
        .setName('historial')
        .setDescription('Muestra el historial de moderación.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)

        .addUserOption(option =>
            option
                .setName('usuario')
                .setDescription('Usuario a revisar.')
                .setRequired(true)
        ),



    async execute(interaction){


        const user =
            interaction.options.getUser('usuario');


        const db =
            interaction.client.db;


        const cases =
            db.prepare(`
                SELECT *
                FROM cases
                WHERE guild_id = ?
                AND user_id = ?
                ORDER BY created_at DESC
                LIMIT 10
            `)
            .all(
                interaction.guild.id,
                user.id
            )
            .catch(() => []);



        let description =
            'No hay registros encontrados.';



        if(cases.length){

            description =
            cases.map((c,index)=>
            `
**Caso #${index+1}**
📌 Acción: ${c.action}
📝 Motivo: ${c.reason}
👮 Staff: <@${c.staff_id}>
📅 Fecha: ${c.created_at}
`
            ).join('\n');

        }



        const embed =
            new EmbedBuilder()
            .setColor('#5865f2')
            .setTitle(`📜 Historial de ${user.tag}`)
            .setDescription(description)
            .setTimestamp();



        return interaction.reply({

            embeds:[embed],

            ephemeral:true

        });

    }

};
