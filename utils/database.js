const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');



let dbPath = path.join(
    __dirname,
    '..',
    'sn_security.db'
);



if(
    process.env.RENDER &&
    fs.existsSync('/data')
){

    dbPath =
    '/data/sn_security.db';

}



const db =
new Database(dbPath);



db.exec(`

CREATE TABLE IF NOT EXISTS guild_config (

    guild_id TEXT PRIMARY KEY,

    log_channel_id TEXT,

    appeal_channel_id TEXT,

    automod_enabled INTEGER DEFAULT 1,

    antiraid_enabled INTEGER DEFAULT 1,

    antinuke_enabled INTEGER DEFAULT 1

);


CREATE TABLE IF NOT EXISTS staff_roles (

    guild_id TEXT,

    role_id TEXT,

    PRIMARY KEY(
        guild_id,
        role_id
    )

);


CREATE TABLE IF NOT EXISTS user_warns (

    guild_id TEXT,

    user_id TEXT,

    warns INTEGER DEFAULT 0,

    PRIMARY KEY(
        guild_id,
        user_id
    )

);


CREATE TABLE IF NOT EXISTS global_blacklist (

    user_id TEXT PRIMARY KEY,

    reason TEXT,

    added_at DATETIME DEFAULT CURRENT_TIMESTAMP

);


CREATE TABLE IF NOT EXISTS cases (

    id INTEGER PRIMARY KEY AUTOINCREMENT,

    guild_id TEXT,

    user_id TEXT,

    staff_id TEXT,

    action TEXT,

    reason TEXT,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP

);

`);



module.exports = {


    db,



    getGuildConfig(guild){

        return db.prepare(`

        SELECT *

        FROM guild_config

        WHERE guild_id = ?

        `)
        .get(guild);

    },



    setLogChannel(guild, channel){


        db.prepare(`

        INSERT INTO guild_config
        (guild_id, log_channel_id)

        VALUES (?,?)

        ON CONFLICT(guild_id)

        DO UPDATE SET

        log_channel_id=excluded.log_channel_id

        `)

        .run(
            guild,
            channel
        );

    },



    addCase(data){


        db.prepare(`

        INSERT INTO cases

        (
        guild_id,
        user_id,
        staff_id,
        action,
        reason
        )

        VALUES (?,?,?,?,?)

        `)

        .run(

            data.guild,
            data.user,
            data.staff,
            data.action,
            data.reason

        );

    }



};
