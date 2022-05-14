const {MessageEmbed} = require("discord.js");

const FullIdentity = require("../FullIdentity");

const config = require("../../config.json");
const FILE_ENDPOINT = config.api_domain + "file/";

class Entry {
    /**
     * Eight character unique ID for this entry
     * @type {string}
     */
    id;

    /**
     * Owner of the Entry
     * @type {FullIdentity}
     */
    owner;

    /**
     * Short offense description for the entry
     * @type {string}
     */
    offense;

    /**
     * Longer description of the entry
     * @type {string}
     */
    description;

    /**
     * Users attached to this entry
     * @type {EntryUser[]}
     */
    users;

    /**
     * Files attached to this entry
     * @type {EntryFile[]}
     */
    files;

    /**
     * Time that the entry was submitted.
     * @type {number}
     */
    time_submitted;

    /**
     * Constructor for a new Entry
     * @param {string} id 
     * @param {FullIdentity} owner
     * @param {string} offense 
     * @param {string} description 
     * @param {EntryUser[]} users 
     * @param {EntryFile[]} files 
     */
    constructor(id, owner, offense, description, users, files, time_submitted) {
        this.id = id;
        this.owner = owner;
        this.offense = offense;
        this.description = description;
        this.users = users;
        this.files = files;
        this.time_submitted = time_submitted;
    }

    discordEmbed() {
        return new Promise(async (resolve, reject) => {
            let discordAccount;
    
            if (this.owner?.discordAccounts && this.owner.discordAccounts.length > 0) {
                discordAccount = this.owner.discordAccounts[0];
            }

            let users = "";

            for (let i = 0; i < this.users.length; i++) {
                let user = this.users[i];
                if (users !== "") users += "\n";

                let name = "";
                let resolved = "";

                if (user.user) {
                    name = user.value;
                    if (user.type === "identity") {
                        try {
                            let identity = await user.resolveUser();
                            name = identity.name;
                            resolved = identity.id;
                        } catch(e) {}
                    } else if (user.type === "twitch") {
                        try {
                            let twitch = await user.resolveUser();
                            name = twitch.display_name;
                            resolved = twitch.id;
                        } catch(e) {}
                    } else if (user.type === "discord") {
                        try {
                            let discord = await user.resolveUser();
                            name = discord.name + "#" + discord.discriminator;
                            resolved = "<@" + discord.id + ">";
                        } catch(e) {}
                    }
                }

                users += `**${user.getType()}:** ${name}${(resolved === "" ? "" : " (" + resolved + ")")}`;
            }

            let files = "";

            for (let i = 0; i < this.files.length; i++) {
                let file = this.files[i];
                if (files !== "") files += "\n";

                let label = file.label ? file.label : file.name;
                if (file.local_path) {
                    files += `[${label}](${FILE_ENDPOINT + file.name})`;
                } else {
                    files += `[${label}](${file.remote_path})`;
                }
            }
            
            const embed = new MessageEmbed()
                .setColor(0x772ce8)
                .setTitle("Serious Ban Entry")
                .addField("Offense", "```" + this.offense + "```")
                .addField("Description", "```" + this.description + "```")
                .setDescription("**Submitted by " + (this.owner?.name ? this.owner.name : "Unresolvable") + "**" + (discordAccount ? " (<@" + discordAccount.id + ">)" : ""))
                .setTimestamp(this.time_submitted)
                .setFooter({text: "ID: " + this.id, iconURL: "https://twitchmodsquad.com/assets/images/logo.webp"});
        
            if (users !== "") {
                embed.addField("User Accounts", users);
            }

            if (files !== "") {
                embed.addField("Files & Links", files);
            }
            
    
            resolve(embed);
        });
    }
}

module.exports = Entry;