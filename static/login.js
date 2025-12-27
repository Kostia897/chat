document.getElementById("form").addEventListener('submit', async function(e){
    e.preventDefault();
    let login = document.getElementById('login').value
    let password = document.getElementById('password').value
    

    if (password != '' && login != ''){
        let data = {
            'login': login,
            'password': password
        }
        const res = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({content: data})
        });
        console.log(res)
        if(res.status === 200){
            const token = await res.json();
            document.cookie = `token=${token}`;
            window.location.assign('/');
        }
        else {
            return alert (res);
        }
        
    }else{
        alert('error')
    }

})