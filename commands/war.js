const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    EmbedBuilder
} = require('discord.js');

module.exports = {

    data: new SlashCommandBuilder()
        .setName('warn')
        .setDescription('Añade una advertencia a un usuario.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)

        .addUserOption(option =>
            option
                .setName('usuario')
                .setDescription('Usuario a advertir.')
                .setRequired(true)
        )

        .addStringOption(option =>
            option
                .setName('motivo')
                .setDescription('Motivo de la advertencia.')
                .setRequired(true)
        ),


    async execute(interaction) {

        const user = interaction.options.getUser('usuario');
        const motivo = interaction.options.getString('motivo');


        const db = interaction.client.dbQuery;


        const data = db.getWarns.get(
            interaction.guild.id,
            user.id
        );


        const warns = (data?.warns || 0) + 1;


        db.setWarns.run(
            interaction.guild.id,
            user.id,
            warns
        );


        const member =
            await interaction.guild.members.fetch(user.id)
            .catch(() => null);



        let action = '⚠️ Advertencia';


        if (warns >= 8) {

            action = '🔨 BAN AUTOMÁTICO';

            if (member) {
                await member.ban({
                    reason: 'Llegó a 8 advertencias.'
                }).catch(() => {});
            }

        } else if (warns >= 4) {

            action = '👢 KICK AUTOMÁTICO';

            if (member) {
                await member.kick(
                    'Llegó a 4 advertencias.'
                ).catch(() => {});
            }

        } else if (warns >= 3) {

            action = '🔇 MUTE AUTOMÁTICO';

            if (member) {
                await member.timeout(
                    60 * 60 * 1000,
                    'Llegó a 3 advertencias.'
                ).catch(() => {});
            }
        }



        const dm = new EmbedBuilder()
            .setColor('#ed4245')
            .setTitle('⚠️ SN SECURITY | Advertencia')
            .addFields(
                {
                    name:'Servidor',
                    value:interaction.guild.name
                },
                {
                    name:'Motivo',
                    value:motivo
                },
                {
                    name:'Warns',
                    value:`${warns}/8`
                },
                {
                    name:'Acción',
                    value:action
                }
            )
            .setTimestamp();


        await user.send({
            embeds:[dm]
        }).catch(()=>{});



        const log = new EmbedBuilder()
            .setColor('#ed4245')
            .setTitle('⚠️ Warn aplicado')
            .addFields(
                {
                    name:'Usuario',
                    value:`${user.tag}`
                },
                {
                    name:'Staff',
                    value:interaction.user.tag
                },
                {
                    name:'Motivo',
                    value:motivo
                },
                {
                    name:'Total',
                    value:`${warns}/8`
                },
                {
                    name:'Acción',
                    value:action
                }
            )
            .setTimestamp();


        const config =
            db.getConfig.get(
                interaction.guild.id
            );


        if(config?.log_channel_id){

            const channel =
                interaction.guild.channels.cache.get(
                    config.log_channel_id
                );

            if(channel){
                channel.send({
                    embeds:[log]
                });
            }
        }


        return interaction.reply({
            content:`⚠️ Warn aplicado a ${user.tag}. Total: ${warns}/8`,
            ephemeral:true
        });
    }
};
