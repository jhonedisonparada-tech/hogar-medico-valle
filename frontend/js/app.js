const formulario = document.querySelector("form");

formulario.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.querySelector("#email").value;
    const password = document.querySelector("#password").value;

    try {
        const respuesta = await fetch("http://localhost:3000/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ email, password })
        });

        const data = await respuesta.json();

        if (respuesta.ok) {
            alert("Bienvenido " + data.usuario.nombre);
            window.location.href = "dashboard.html";
        } else {
            alert(data.mensaje);
        }

    } catch (error) {
        alert("Error al conectar con el servidor");
        console.error(error);
    }
});
