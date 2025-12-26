document.getElementById("form").addEventListener('submit', async function(e){
    e.preventDefault();
    let login = document.getElementById('login').value
    let password = document.getElementById('password').value
    let repeatPassword = document.getElementById("repeat-password").value

    if (password == repeatPassword && password != '' && login != ''){
        let data = {
            'login': login,
            'password': password
        }
        const res = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({content: data})
        });

        const exists = await res.json();
        
        if(exists){
            alert('Цей логін вже використовується')
        } else{
            alert('Успішно!')
            login = document.getElementById('login').value = '';
            password = document.getElementById('password').value = '';
            repeatPassword = document.getElementById("repeat-password").value = '';
        }

        
        
    }else{
        alert('error')
    }

})