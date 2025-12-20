const fs = require('fs')

const dbFile = "./chat.db";
const exists = fs.existsSync(dbFile);
const sqlite3 = require("sqlite3").verbose();
const dbWrapper = require("sqlite");
let db;

dbWrapper
    .open({
        filename:dbFile,
        driver: sqlite3.Database
    })
    .then(async dBase => {
        db = dBase;
        try {
            if (!exists) {
                await db.run(
                    `CREATE TABLE user(
                        user_id INTEGER PRIMARY KEY AUTOINCREMENT,
                        login TEXT,
                        password TEXT
                    );`
                );
                await db.run(`INSERT INTO user(login, password) VALUES('robouser1', 'q1q2q3');`);
                await db.run(`CREATE TABLE message(
                        message_id INTEGER PRIMARY KEY AUTOINCREMENT,
                        content VARCHAR(1000) NOT NULL,
                        author_id INTEGER NOT NULL,
                        dialog_id INTEGER NOT NULL,
                        CONSTRAINT fk_author_id FOREIGN KEY (author_id) REFERENCES user(user_id),
                        CONSTRAINT fk_dialog_id FOREIGN KEY (dialog_id) REFERENCES dialog(id)
                    )`);
            } else {
                // await db.run(`INSERT INTO user(login, password) VALUES('robouser', 'q1q2q3');`);
                console.log(await db.all("SELECT * from user"))
            }
        } catch (dbError) {
            console.error(dbError);
        }
    })




module.exports = {
    getMessages: async () => {
        try{
            return await db.all(
                `SELECT message_id, content, login, author_id from message 
                JOIN user ON message.author_id = user.user_id`
            );
        } catch (dbError) {
            console.error(dbError);
        }
    },
    addmessage: async (msg, userId) => {
        await db.run(
            `INSERT INTO message(content, author_id, dialog_id) VALUES (?,?,?)`,
            [msg, userId, 1]
        )
    },
    userExists: async () => {
        try{
            return await db.all(
                `SELECT `
            )
        } catch (dbError) {
            console.log(dbError)
        }
    }
}