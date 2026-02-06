const fs = require('fs')
const crypto = require('crypto')

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
                        password TEXT NOT NULL,
                        avatar TEXT NOT NULL,
                        salt TEXT NOT NULL,
                        lastOnline TEXT NOT NULL
                    );`
                );
                await db.run(
                    `CREATE TABLE dialog(
                        dialog_id INTEGER PRIMARY KEY AUTOINCREMENT,
                        first_user_id INTEGER NOT NULL,
                        second_user_id INTEGER NOT NULL,
                        CONSTRAINT fk_first_user FOREIGN KEY (first_user_id) REFERENCES user(user_id),
                        CONSTRAINT fk_second_user FOREIGN KEY (second_user_id) REFERENCES user(user_id)
                    );`
                );
                await db.run(
                    `CREATE TABLE message(
                        message_id INTEGER PRIMARY KEY AUTOINCREMENT,
                        content VARCHAR(1000) NOT NULL,
                        date TEXT NOT NULL,
                        author_id INTEGER NOT NULL,
                        dialog_id INTEGER NOT NULL,
                        CONSTRAINT fk_author_id FOREIGN KEY (author_id) REFERENCES user(user_id),
                        CONSTRAINT fk_dialog_id FOREIGN KEY (dialog_id) REFERENCES dialog(dialog_id)
                    );`
                );
            } else {
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
                `SELECT message_id, content, login, author_id, dialog_id
                FROM message 
                JOIN user ON message.author_id = user.user_id`
            );
        } catch (dbError) {
            console.error(dbError);
        }
    },
    getMessagesFromDialog: async (dialogId) => {
        try{
            return await db.all(
                `SELECT message_id, content, date, login, author_id, dialog_id
                FROM message 
                JOIN user ON message.author_id = user.user_id AND message.dialog_id = ?
                ;`, [dialogId]
            );
        } catch (dbError) {
            console.error(dbError);
        }
    },
    addMessage: async (msg, userId, dialogId, date) => {
        try{
            await db.run(
                `INSERT INTO message(content, author_id, dialog_id, date) VALUES (?,?,?,?)`,
                [msg, userId, dialogId, date]
            )
        } catch (dbError) {
            console.error(dbError);
        }
    },
    userExists: async (login) => {
        try{
            const user = await db.all(
                `SELECT * FROM user WHERE login = ?`,
                [login]
            );
            return user.length > 0;
        } catch (dbError) {
            console.log(dbError);
            return false;
        }
    },
    addUser: async (login, password, avatar, salt) => {
        try{
            let now = new Date();
            await db.run(`
                INSERT INTO user(login, password, avatar, salt, lastOnline) VALUES(?, ?, ?, ?, ?);`,
                [login, password, avatar, salt, now]
            );
        } catch (dbError) {
            console.log(dbError);
        }
    },
    getAuthToken: async (user) => {
        const candidate = await db.all(`SELECT * FROM user WHERE login = ?`, [user.login]);
        if(!candidate.length) {
            throw new Error('Wrong login');
        }
        
        const password = crypto.pbkdf2Sync(user.password, candidate[0].salt, 1000, 64, `sha512`).toString(`hex`);

        if(candidate[0].password !== password) {
            throw new Error('Wrong password');
        }
        console.log(candidate[0])
        const token = candidate[0].user_id + '.' + candidate[0].login + '.' + crypto.randomBytes(20).toString('hex');
        return token;
    },
    getDialogs: async (userId) => {
        try{
            return await db.all(
                `SELECT dialog_id, user_id, login
                FROM dialog
                JOIN user ON (user.user_id = first_user_id AND dialog.second_user_id = ?)
                          OR (user.user_id = second_user_id AND dialog.first_user_id = ?)
                ;`,
                [userId, userId]
            );
        } catch (dbError) {
            console.log(dbError);
        }
    },
    findUserByLogin: async (login) => {
        try{
            return await db.get(
                `SELECT user_id, login, avatar FROM user WHERE login = ?`,
                [login]
            );
        } catch (dbError) {
            console.log(dbError);
        }
    },
    getDialog: async (user1, user2) => {
        try{
            const [first, second] = user1 < user2 ? [user1, user2] : [user2, user1];

            const dialog = await db.get(
                `SELECT dialog_id FROM dialog
                WHERE first_user_id = ? AND second_user_id = ?;`,
                [first, second]
            );

            return dialog;
        } catch (dbError) {
            console.log(dbError);
        }
    },
    createDialog: async (user1, user2) => {
        try{
            const [first, second] = user1 < user2 ? [user1, user2] : [user2, user1];

            const res = await db.run(
                `INSERT INTO dialog(first_user_id, second_user_id)
                VALUES (?, ?);`,
                [first, second]
            );

            return res.lastID;
        } catch (dbError) {
            console.log(dbError);
        }
    },
    getAvatarUrl: async (userId) => {
        try{
            return await db.get(
                `SELECT avatar FROM user WHERE user_id = ? 
                ;`,
                [userId]
            );
        } catch (dbError) {
            console.log(dbError);
        }
    },
    getUserStatus: async (userId) => {
        try{
            return await db.get(
                `SELECT lastOnline FROM user WHERE user_id = ?;`,
                [userId]
            )
        } catch (dbError) {
            console.log(dbError)
        }
    },
    updateLastOnline: async (userId, lastOnline) => {
        try{
            return await db.run(
                'UPDATE user SET lastOnline = ? WHERE user_id = ?',
                [lastOnline, userId]
            ); 
        } catch (dbError) {
            console.log(dbError)
        }
    }
}
