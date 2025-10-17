const ws = require("ws");

const miServer = new ws.WebSocketServer({port:8080}, ()=>{
    console.log("Servidor iniciado")
});

var jugadores = [];
var turno = 0;
var tablero = [ -1, -1, -1, 
                -1, -1, -1, 
                -1, -1, -1 ];

miServer.on("connection", (jugador)=>{
    // conexión nueva
    console.log("conexión nueva...");

    // si ya tengo 2 jugadores... rechazar la conexión
    if (jugadores.length>1) {
        // rechazar la conexión
        jugador.close();
        return;
    }

    // añadir el jugador a la lista
    jugadores.push(jugador);
    // (decirle quien es: O  X )
    var ficha="O";
    if (jugadores.length==1) ficha="O"; else ficha="X";

    var mensaje = {
        tipo: "bienvenida",
        datos: ficha
    }
    var mensajeJSON = JSON.stringify(mensaje);
    jugador.send(mensajeJSON);

    // si ya estamos todos (2) empezar el juego
    if (jugadores.length==2) {
        var mensaje = {
            tipo: "inicio"
        }
        var mensajeJSON=JSON.stringify(mensaje);
        for(var i=0;i<jugadores.length;i++) {
            jugadores[i].send(mensajeJSON);
        }
    }

    jugador.on("message", (mensajeJSON)=>{
        var mensaje = JSON.parse(mensajeJSON.toString());
        switch(mensaje.tipo) {
            case "tirada":
                // es tu turno?
                if (jugadores[turno]!=jugador) {
                    jugador.send(
                        JSON.stringify(
                            {
                                tipo: "error",
                                datos: "No es tu turno"
                            }
                        )
                    );
                    return;
                }
                // la casilla está libre?
                if (tablero[mensaje.datos.id-1]==-1) {
                    // TODO BIEN... decirselo a todos
                    tablero[mensaje.datos.id-1]=turno;
                    mensaje.datos.ficha=turno;
                    jugadores.forEach(j => {
                        j.send(JSON.stringify(mensaje));         
                    });

                    // comprobar si ganar/perder/empate
                    // -1=partida continua...   0=gana O.   1=gana X.   2=empate
                    var fin=finpartida();
                    var texto="";
                    if (fin>=0) {
                        // se acabó el juego
                        // informar a todos de quien ha ganado/perdido/empate
                        for (i=0;i<jugadores.length;i++) {
                            texto=(fin==i)?"Has ganado":"Has perdido";
                            if (fin==2) texto="Empate";
                            jugadores[i].send(JSON.stringify(
                                {
                                    tipo:"fin",
                                    datos: texto
                                }
                            ))
                        }
                        // reiniciar tablero (partida nueva)
                        tablero = [ -1, -1, -1, 
                                    -1, -1, -1, 
                                    -1, -1, -1 ];
                        for (var i=0;i<jugadores.length;i++) {
                            jugadores[i].send(JSON.stringify({
                                tipo:"vaciar"
                            }));
                        }

                    } else {
                        // la partida continua...
                        // cambiar el turno
                        turno=1-turno;
                        // informar al jugador que es su turno
                        jugadores[turno].send(JSON.stringify({tipo:"turno"}));
                    }

                } else {
                    jugador.send(
                        JSON.stringify(
                            {
                                tipo: "error",
                                datos: "Esa casilla esta ocupada"
                            }
                        )
                    );
                    return;
                }
                break;
            default: break;
        }
    })

    jugador.on("close", ()=>{
        // comprobar si se ha ido alguno de los jugadores activos
        if (jugadores.indexOf(jugador)>=0) {
            // cancelar la partida
            // reiniciar tablero (partida nueva)
            tablero = [ -1, -1, -1, 
                        -1, -1, -1, 
                        -1, -1, -1 ];
            for (var i=0;i<jugadores.length;i++) {
                jugadores[i].send(JSON.stringify({
                    tipo:"vaciar"
                }));
            }
            // expulsar a todos
            jugadores.forEach( (j)=>{ j.close(); });
            jugadores=[];
        }
    })

})

function finpartida() {
    // horizontales
    if (tablero[0]==tablero[1] && tablero[1]==tablero[2]) return tablero[0];
    if (tablero[3]==tablero[4] && tablero[4]==tablero[5]) return tablero[3];
    if (tablero[7]==tablero[8] && tablero[8]==tablero[9]) return tablero[7];

    // verticales
    if (tablero[0]==tablero[3] && tablero[3]==tablero[6]) return tablero[0];
    if (tablero[1]==tablero[4] && tablero[4]==tablero[7]) return tablero[1];
    if (tablero[2]==tablero[5] && tablero[5]==tablero[8]) return tablero[2];

    // diagonales
    if (tablero[0]==tablero[4] && tablero[4]==tablero[8]) return tablero[0];
    if (tablero[2]==tablero[4] && tablero[4]==tablero[6]) return tablero[2];

    for (var i=0;i<tablero.length; i++) {
        if (tablero[i]==-1) return -1;
    }

    return 2;
}