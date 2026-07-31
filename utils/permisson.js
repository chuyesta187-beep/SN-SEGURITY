const {
    PermissionFlagsBits
} = require('discord.js');



module.exports = {



    // Permiso administrador de Discord

    isAdmin(member){

        return member.permissions
        .has(
            PermissionFlagsBits.Administrator
        );

    },




    // Verifica si tiene rol Staff configurado

    async isStaff(member, client){


        if(
            this.isAdmin(member)
        ) return true;



        const roles =
        client.dbQuery.getStaffRoles.all(
            member.guild.id
        );



        const staffRoles =
        roles.map(
            r => r.role_id
        );



        return member.roles.cache.some(
            role =>
            staffRoles.includes(role.id)
        );


    },




    // Permiso de moderación

    canModerate(member){


        return member.permissions.has(

            PermissionFlagsBits
            .ModerateMembers

        );


    },




    // Protección contra usuarios sin permiso

    check(member, permission){


        return member.permissions.has(
            permission
        );


    }




};
