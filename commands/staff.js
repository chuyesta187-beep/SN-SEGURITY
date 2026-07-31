const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    EmbedBuilder
} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('staff')
        .setDescription('Sistema de administración del Staff.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)

        .addSubcommandGroup(group =>
            group
                .setName('rol')
                .setDescription('Gestiona roles autorizados del Staff.')

                .addSubcommand(sub =>
                    sub
                        .setName('añadir')
                        .setDescription('Añade un rol de Staff.')
                        .addRoleOption(option =>
                            option
                                .setName('rol')
                                .setDescription('Rol que será Staff.')
                                .setRequired(true)
                        )
                )

                .addSubcommand(sub =>
                    sub
                        .setName('quitar')
                        .setDescription('Quita un rol de Staff.')
                        .addRoleOption(option =>
                            option
                                .setName('rol')
                                .setDescription('Rol que será eliminado.')
                                .setRequired(true)
                        )
                )

                .addSubcommand(sub =>
                    sub
                        .setName('lista')
                        .setDescription('Muestra los roles Staff.')
                )
        ),

    async execute(interaction) {

        const sub = interaction.options.getSubcommand();
        const db = interaction.client.dbQuery;


        if (sub === 'añadir') {

            const role = interaction.options.getRole('rol');

            db.addStaffRole.run(
                interaction.guild.id,
                role.id
            );

            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#57f287')
                        .setTitle('👮 Staff añadido')
                        .setDescription(
                            `El rol ${role} ahora puede gestionar tickets.`
                        )
                ],
                ephemeral: true
            });
        }


        if (sub === 'quitar') {

            const role = interaction.options.getRole('rol');

            db.removeStaffRole.run(
                interaction.guild.id,
                role.id
            );

            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#ed4245')
                        .setTitle('🗑️ Staff eliminado')
                        .setDescription(
                            `El rol ${role} fue removido.`
                        )
                ],
                ephemeral: true
            });
        }


        if (sub === 'lista') {

            const roles = db.getStaffRoles.all(
                interaction.guild.id
            );

            const lista = roles.length
                ? roles.map(r => `<@&${r.role_id}>`).join('\n')
                : 'No hay roles configurados.';

            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#2b2d31')
                        .setTitle('👮 Roles Staff')
                        .setDescription(lista)
                ],
                ephemeral: true
            });
        }
    }
};
