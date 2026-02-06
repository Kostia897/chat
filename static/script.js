const socket = io({
    auth: {
        cookie: document.cookie
    }
});

let form = document.getElementById('form')
let input = document.getElementById('input')
let list = document.getElementById('messages')

let user_id = null;
let login = null;
let currentDialogId = null;
let dialogs = '';

document.getElementById('deleteCookies').addEventListener('click', function(e){
    e.preventDefault();
    document.cookie = 'token=; Max-Age=0';
    window.location.assign('/login');
})

form.addEventListener('submit', function(e){
    e.preventDefault();
    if(!input.value) return;
    if (!user_id || !currentDialogId) {
        alert('choose dialog');
        return;
    }
    socket.emit('new_message', input.value, currentDialogId)
    input.value = '';
})

const messageSound = new Audio('/sound.mp3');
messageSound.preload = 'auto';
const messageSound2 = new Audio('/sound2.mp3');
messageSound2.preload = 'auto';

socket.on('message', (message) => {
    if(message.dialog_id != currentDialogId) return;

    let is_dialog_exists = false;

    for(let i = 0; i < dialogs.length; i++){
        if(message.dialog_id == dialogs[i].dialog_id){
            is_dialog_exists = true;
            break
        }
    }

    if(!is_dialog_exists){
        loadDialogs()
    }

    let date = new Date(message.date);

    if (user_id == message.author_id) {
        messageSound2.currentTime = 0;
        messageSound2.play();
        list.innerHTML += `<li class="li-right">${message.content} <p class='date'>${date.toLocaleString()}</p></li>`
    } else {
        messageSound.currentTime = 0;
        messageSound.play();
        list.innerHTML += `<li>${message.content} <p class='date'>${date.toLocaleString()}</p></li>`
    }
    window.scrollTo(0, document.body.scrollHeight)
})

socket.on('user_disconnect_or_connect', () => {
    loadDialogs()
})

async function loadMessages(dialogId) {
    currentDialogId = dialogId;
    const res = await fetch(`/messages?dialog=${dialogId}`);
    const messages = await res.json();
    list.innerHTML = '';

    const cookie = await cookieStore.get('token')
    const token = cookie.value;
    [user_id, login] = token.split('.');

    messages.forEach(message => {
        let date = new Date(message.date);
        if( user_id == message.author_id ){
            list.innerHTML += `<li class="li-right">${message.content} <p class='date'>${date.toLocaleString()}</p></li>`
        } else{
            console.log(message.author_id)
            list.innerHTML += `<li>${message.content} <p class='date'>${date.toLocaleString()}</p></li>`
        }
    }
);
    window.scrollTo(0, document.body.scrollHeight)
}

async function loadDialogs() {
    const res = await fetch('/dialogs');
    dialogs = await res.json();
    const dialogsList = document.getElementById('dialogs');
    dialogsList.innerHTML = '';

    dialogs.forEach(async dialog => {
        const li = document.createElement('li');
        li.id = 'dialog';
        li.textContent = dialog.login;

        const avatar = document.createElement('img');
        avatar.id = "avatar";

        const res2 = await fetch(`/getAvatarUrl?userId=${dialog.user_id}`);
        const data2 = await res2.json();
        
        const avatarUrl = data2.avatar;

        if(avatarUrl){
            avatar.src = avatarUrl;
        }else{
            avatar.src = 'https://cdn-icons-png.flaticon.com/512/8345/8345328.png'
        }

        li.appendChild(avatar);


        const status = document.createElement('p');
        status.id = "onlineStatus";

        const res3 = await fetch(`/status?user=${dialog.user_id}`);
        const data3 = await res3.json();
        if (data3.user_status == 'Online'){
            status.textContent = data3.user_status;
        }else{
            const date = new Date(Number(data3.user_status));
            status.textContent = date.toLocaleString();
        }

        li.appendChild(status);

        li.addEventListener('click', () => loadMessages(dialog.dialog_id));
        dialogsList.appendChild(li);
    });
}


document.getElementById('searchForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const nick = document.getElementById('searchInput').value;
    if(!nick) return;

    const res = await fetch('/api/find_or_create_dialog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login: nick })
    });

    if(res.status === 404) {
        alert('User not found');
        return;
    }

    const data = await res.json();
    loadMessages(data.dialog_id); 
    document.getElementById('searchInput').value = '';
    loadDialogs();
});

