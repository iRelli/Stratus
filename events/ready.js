const mongoose = require("mongoose");
const Levels = require("discord-xp");

require("dotenv").config();

module.exports = {
    name: "ready",
    async execute(client) {
        console.log(`🚀 Stratus is online as ${client.user.tag}`);        
        // ✅ Connect to MongoDB
        mongoose.connect(process.env.MONGO_URI, {
          
        }).then(() => {
            console.log("✅ Connected to MongoDB");
            Levels.setURL(process.env.MONGO_URI); 
        }).catch((err) => {
            console.error("❌ MongoDB Connection Error:", err);
        });
        
    }
};
