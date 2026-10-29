// ESTANDAR DE PRECIPITACION EN CALI (mm)
const ESTANDAR_CALI = 14;
const FACTOR_TARDE = 1.053; // ajuste 5.3%

// VECTORES DE REGISTROS
let zonas = [];
let lluvias = [];
let grafica = null;
let stream = null;
let fotoTomada = false;

// ---------- LOGIN ----------
function ingresar() {
    let usuario = document.getElementById("usuario").value;
    let clave = document.getElementById("clave").value;
    let mensaje = document.getElementById("mensaje");

    if (usuario === "CVC" && clave === "Lluvias") {
        document.getElementById("login").classList.add("oculto");
        document.getElementById("panel").classList.remove("oculto");
        mensaje.innerHTML = "";
    } else {
        mensaje.innerHTML = "USUARIO - CONTRASEÑA INCORRECTOS";
    }
}

function cerrarSesion() {
    detenerCamara();
    limpiarCampos();
    document.getElementById("usuario").value = "";
    document.getElementById("clave").value = "";
    document.getElementById("panel").classList.add("oculto");
    document.getElementById("login").classList.remove("oculto");
}

// ---------- UTILIDADES ----------
function pausa(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function aMinutos(hora) {
    let partes = hora.split(":");
    return parseInt(partes[0]) * 60 + parseInt(partes[1]);
}

// ---------- CALCULO Y REGISTRO ----------
async function calcularRegistrar() {
    let direccion = document.getElementById("direccion").value;
    let horaInicio = document.getElementById("horaInicio").value;
    let horaFin = document.getElementById("horaFin").value;
    let precipitacion = parseFloat(document.getElementById("precipitacion").value);
    let registrador = document.getElementById("registrador").value;

    if (!direccion || !horaInicio || !horaFin || isNaN(precipitacion) || !registrador) {
        alert("COMPLETE TODOS LOS CAMPOS");
        return;
    }

    // TIEMPO TOTAL EN HORAS (si termina despues de medianoche suma 24 h)
    let minutos = aMinutos(horaFin) - aMinutos(horaInicio);
    if (minutos <= 0) minutos += 24 * 60;
    let tiempoTotal = minutos / 60;

    // FORMULA: precipitacion * estandar * tiempo total
    let resultado = precipitacion * ESTANDAR_CALI * tiempoTotal;

    // AJUSTE 5.3% SI INICIA ENTRE 3:00 P.M. Y 6:00 P.M.
    let inicio = aMinutos(horaInicio);
    let ajustado = inicio >= 15 * 60 && inicio <= 18 * 60;
    if (ajustado) resultado = resultado * FACTOR_TARDE;

    // COMPARACION CONTRA EL ESTANDAR
    let comparacion;
    if (precipitacion > ESTANDAR_CALI) {
        comparacion = '<span class="alto">SUPERA el estándar de Cali (' + ESTANDAR_CALI + ' mm)</span>';
    } else if (precipitacion < ESTANDAR_CALI) {
        comparacion = '<span class="ok">está POR DEBAJO del estándar de Cali (' + ESTANDAR_CALI + ' mm)</span>';
    } else {
        comparacion = "es IGUAL al estándar de Cali (" + ESTANDAR_CALI + " mm)";
    }

    // EFECTO RELOJ: contador que sube de 0 hasta el resultado
    let caja = document.getElementById("resultado");
    let pasos = 40;
    for (let i = 0; i <= pasos; i++) {
        let valor = (resultado * i / pasos).toFixed(2);
        caja.innerHTML = "⏱ Calculando... " + valor;
        await pausa(50);
    }

    caja.innerHTML =
        "Zona: " + direccion + "<br>" +
        "Tiempo total: " + tiempoTotal.toFixed(2) + " h<br>" +
        "Valor calculado: " + resultado.toFixed(2) + (ajustado ? " (ajuste 5.3% aplicado)" : "") + "<br>" +
        "Registro de " + precipitacion + " mm " + comparacion;

    // GUARDAR EN LOS VECTORES Y DIBUJAR
    zonas.push(direccion);
    lluvias.push(precipitacion);
    dibujarGrafica();

    // CLAVE DE SEGURIDAD
    await pausa(100); // deja pintar la grafica antes del prompt
    let palabra = prompt("Para registrar otra zona escriba la clave CLIMA");
    if (palabra === "CLIMA") {
        limpiarCampos();
    } else {
        alert("CLAVE INCORRECTA. VOLVIENDO AL LOGIN");
        cerrarSesion();
    }
}

function limpiarCampos() {
    document.getElementById("direccion").value = "";
    document.getElementById("horaInicio").value = "";
    document.getElementById("horaFin").value = "";
    document.getElementById("precipitacion").value = "";
    document.getElementById("registrador").value = "";
    document.getElementById("resultado").innerHTML = "Aquí aparecerá el resultado";
    quitarFoto();
}

// ---------- GRAFICA DE BARRAS ----------
function dibujarGrafica() {
    let plano = document.getElementById("grafica");
    if (grafica) {
        grafica.destroy();
    }

    grafica = new Chart(plano, {
        type: "bar",
        data: {
            labels: zonas,
            datasets: [{
                label: "Precipitación (mm)",
                data: lluvias,
                backgroundColor: "#0077cc"
            }]
        },
        options: {
            maintainAspectRatio: false,
            scales: { y: { beginAtZero: true } }
        }
    });
}

// ---------- FOTO DE LA ZONA ----------
// Primer clic: enciende la camara. Segundo clic: captura la foto.
async function tomarFoto() {
    let video = document.getElementById("video");
    let foto = document.getElementById("foto");
    let boton = document.getElementById("btnFoto");

    if (!stream) {
        try {
            stream = await navigator.mediaDevices.getUserMedia({ video: true });
        } catch (e) {
            alert("No se pudo acceder a la cámara");
            return;
        }
        video.srcObject = stream;
        foto.classList.add("oculto");
        video.classList.remove("oculto");
        document.getElementById("textoFoto").classList.add("oculto");
        boton.innerHTML = "Capturar";
    } else {
        let lienzo = document.createElement("canvas");
        lienzo.width = video.videoWidth;
        lienzo.height = video.videoHeight;
        lienzo.getContext("2d").drawImage(video, 0, 0);
        foto.src = lienzo.toDataURL("image/png");
        detenerCamara();
        video.classList.add("oculto");
        foto.classList.remove("oculto");
        boton.innerHTML = "Tomar foto";
    }
}

function detenerCamara() {
    if (stream) {
        stream.getTracks().forEach(t => t.stop());
        stream = null;
    }
}

function quitarFoto() {
    detenerCamara();
    document.getElementById("video").classList.add("oculto");
    document.getElementById("foto").classList.add("oculto");
    document.getElementById("foto").removeAttribute("src");
    document.getElementById("textoFoto").classList.remove("oculto");
    document.getElementById("btnFoto").innerHTML = "Tomar foto";
}