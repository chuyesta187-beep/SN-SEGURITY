require('dotenv').config();

const fs = require('fs');
const path = require('path');

const {
    REST,
    Routes
} = require('discord.js');

const commands = [];

const commandsPath = path.join(__dirname, 'commands');

const commandFiles = fs.readdirSync(commandsPath)
    .filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const command = require(path.join(commandsPath, file));

    if (command.data) {
        commands.push(command.data.toJSON());
        console.log(`📌 Cargado: /${command.data.name}`);
    }
}

const rest = new REST({ version: '10' })
    .setToken(process.env.DISCORD_TOKEN);

(async () => {
    try {
        console.log(`🔄 Registrando ${commands.length} comandos en STEAL NATION...`);

        await rest.put(
            Routes.applicationGuildCommands(
                process.env.CLIENT_ID,
                '1528288052802355220'
            ),
            {
                body: commands
            }
        );

        console.log('✅ Slash commands registrados correctamente en STEAL NATION');

    } catch (error) {
        console.error('❌ Error registrando comandos:', error);
    }
})();
