const http = require('http');
const fs = require('fs')
const path = require('path');
const { Server } = require ("socket.io")
const crypto = require('crypto')
const db = require('./database');
const { json } = require('stream/consumers');
const cookie = require('cookie')

let validAuthTokens = []


// const mysql = require('mysql2');
// const connection = mysql.createConnection({
//     host: 'localhost',
//     user: 'root',
//     password: '1111',
//     database: 'chat'
// })

// const pool = mysql.createPool({
//     host: 'localhost',
//     user: 'root',
//     password: '1111',
//     database: 'chat'
// });

// const promisePool = pool.promise()


const pathToIndex = path.join(__dirname, 'static', 'index.html');
const indexHtmlFile = fs.readFileSync(pathToIndex);

const pathToStyle = path.join(__dirname, 'static', 'style.css');
const styleCssFile = fs.readFileSync(pathToStyle);

const pathToScript = path.join(__dirname, 'static', 'script.js');
const scriptJsFile = fs.readFileSync(pathToScript);

const pathToRegisterHtml = path.join(__dirname, 'static', 'register.html');
const registerHtml = fs.readFileSync(pathToRegisterHtml);

const authJsPath = path.join(__dirname, 'static', 'auth.js');
const authJs = fs.readFileSync(authJsPath);

const registerCssPath = path.join(__dirname, 'static', 'register.css');
const registerCss = fs.readFileSync(registerCssPath);

const loginHtmlPath = path.join(__dirname, 'static', 'login.html');
const loginHtml = fs.readFileSync(loginHtmlPath);

const loginJsPath = path.join(__dirname, 'static', 'login.js');
const loginJs = fs.readFileSync(loginJsPath);

const soundPath = path.join(__dirname, 'static', 'sounds', 'sound.mp3');
const sound = fs.readFileSync(soundPath);

const sound2Path = path.join(__dirname, 'static', 'sounds', 'sound2.mp3');
const sound2 = fs.readFileSync(sound2Path);

const server = http.createServer(async (req, res) => {
    // if(req.url === '/') {
    //     return res.end(indexHtmlFile);
    // }
    if(req.url === '/style.css'){
        return res.end(styleCssFile)
    }
    else if(req.url === '/script.js'){
        return res.end(scriptJsFile)
    }
    else if(req.url == '/messages' && req.method == 'GET'){
        let messages = await db.getMessages()
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify(messages));
    }
    else if(req.url === '/register'){
        return res.end(registerHtml)
    }
    else if(req.url === '/auth.js'){
        return res.end(authJs)
    }
    else if(req.url == '/register.css'){
        return res.end(registerCss)
    }
    else if(req.url == '/login'){
        return res.end(loginHtml)
    }
    else if(req.url === '/login.js'){
        return res.end(loginJs)
    }
    else if(req.url === '/sound.mp3'){
        return res.end(sound)
    }
    else if(req.url === '/sound2.mp3'){
        return res.end(sound2)
    }
    else if(req.url === '/api/login'){
        let data = '';
        req.on('data', function(chunk) {
            data += chunk;
        });
        req.on('end', async function() {
            data = JSON.parse(data);
            const user = data.content
            try {
                const token = await db.getAuthToken(user);
                validAuthTokens.push(token);
                res.writeHead(200)
                res.end(JSON.stringify(token));
            }
            catch(e) {
                res.writeHead(500);
                return res.end(JSON.stringify({message: e.message }));
            }
        })
    }
    else if(req.url === '/api/register'){
        let data = '';
        req.on('data', function(chunk) {
            data += chunk;
        });
        req.on('end', async function() {
            data = JSON.parse(data);
            const exists = await db.userExists(data.content.login);
            if(!exists){
                const salt = crypto.randomBytes(16).toString('hex')
                const password = crypto.pbkdf2Sync(data.content.password, salt, 1000, 64, `sha512`).toString(`hex`);
                await db.addUser(data.content.login, password, data.content.avatar, salt)
            }
            return res.end(JSON.stringify(exists));
        })
    }
    else if(req.url === '/dialogs' && req.method === 'GET'){
        const credentionals = guarded(req, res);
        if (!credentionals) return;
        const dialogs = await db.getDialogs(credentionals.user_id);
        res.writeHead(200)
        res.end(JSON.stringify(dialogs));
    }
    else if(req.url.startsWith('/messages?dialog=') && req.method === 'GET'){
        const credentionals = guarded(req, res);
        if (!credentionals) return;

        const dialogId = req.url.split('=')[1];

        const messages = await db.getMessagesFromDialog(dialogId)

        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        return res.end(JSON.stringify(messages));
    }
    else if(req.url.startsWith('/getAvatarUrl?userId=') && req.method === 'GET'){
        const credentionals = guarded(req, res);
        if (!credentionals) return;

        const userId = req.url.split('=')[1];

        const avatarUrl = await db.getAvatarUrl(userId)
        console.log(avatarUrl)
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        return res.end(JSON.stringify({ avatar: avatarUrl.avatar }));
    }
    else if(req.url === '/api/find_or_create_dialog' && req.method === 'POST'){
        let data = '';
        req.on('data', function(chunk) {
            data += chunk;
        });
        req.on('end', async () => {
            const credentionals = guarded(req, res);
            if (!credentionals) return;

            const { login } = JSON.parse(data);
            const user = await db.findUserByLogin(login);

            if(!user) { 
                res.writeHead(404); 
                return res.end('User not found'); 
            }

            let dialogId = await db.getDialog(parseInt(credentionals.user_id), user.user_id);

            if (!dialogId) {
                dialogId = await db.createDialog(parseInt(credentionals.user_id), user.user_id)
            };

            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            return res.end(JSON.stringify({ dialog_id: dialogId.dialog_id }));
        });
    }
    else {
        guarded(req,res) 
    }
    
    
})

server.listen(3000)



const io = new Server(server)

io.use((socket, next) => {
    const cookie = socket.handshake.auth.cookie;
    const credentionals = getCredentionals(cookie);
    if(!credentionals) {
        return next(new Error("no auth"));
    }
    socket.credentionals = credentionals;
    next();
})

io.on('connection', (socket) => {
    const userNickname = socket.credentionals.login;
    const userId = socket.credentionals.user_id;

    socket.on('new_message', async (content, dialogId) => {
        await db.addMessage(content, userId, dialogId);

        io.emit('message', {
            content: content,
            author_id: userId,
            dialog_id: dialogId,
            login: userNickname 
        });
    });
})

function guarded(req,res) {
    const credentionals = getCredentionals(req.headers?.cookie);
    if(!credentionals) {
        res.writeHead(302, {'Location': '/login'});
        return res.end()
    }
    if(req.url) {
        switch(req.url) {
            case '/': return res.end(indexHtmlFile);
            case '/script.js': return res.end(scriptJsFile)
        }
    }
    return credentionals
}

function getCredentionals(cookies = ""){
    const parsedCookies = cookie.parse(cookies);
    const token = parsedCookies?.token;

    if(!token || !validAuthTokens.includes(token)){
        return null;
    }
    const [user_id, login] = token.split(".");

    if(!user_id || !login){
        return null;
    }

    return{user_id, login}
}
