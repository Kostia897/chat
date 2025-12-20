document.getElementById("form").addEventListener('submit', async function(e){
    e.preventDefault();
    let login = document.getElementById('login').value
    let password = document.getElementById('password').value
    let repeatPassword = document.getElementById("repeat-password").value

    if (password == repeatPassword && password != ''){
        let data = []
        data.push(login)
        data.push(password)
        console.log(data)
        await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({content: data})
        });

        login = document.getElementById('login').value = '';
        password = document.getElementById('password').value = '';
        repeatPassword = document.getElementById("repeat-password").value = '';
        alert('succesfull!')
    }else{
        alert('error')
    }

})