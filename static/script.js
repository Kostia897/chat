const socket = io();

let form = document.getElementById('form')
let input = document.getElementById('input')
let list = document.getElementById('messages')

form.addEventListener('submit', function(e){
    e.preventDefault();
    if (input.value) {
        socket.emit('new_message', input.value)
        input.value = '';
    }
})

socket.on('message', (message) => {
    list.innerHTML += `<li>${message}</li>`
    window.scrollTo(0, document.body.scrollHeight)
})

function changeNickname(){
    let newNickname = prompt('New Nickname: ')
    socket.emit('new_nickname', newNickname)
}


async function loadMessages() {
    const res = await fetch('/messages');
    const messages = await res.json();
    list.innerHTML = '';
    messages.forEach(message => list.innerHTML += '<li>' + message.content + '</li>');
    window.scrollTo(0, document.body.scrollHeight)
}

loadMessages()