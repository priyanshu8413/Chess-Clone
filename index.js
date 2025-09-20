const express = require("express");
const socket = require("socket.io");
const http = require("http");
const { Chess } = require("chess.js");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = socket(server);

const chess = new Chess();

let players = {};
let currentPlayer = "w";

let timers = { w: 300, b: 300 }; 
let timerInterval;


function resetGame() {
    chess.reset(); 
    timers = { w: 300, b: 300 }; 
    clearInterval(timerInterval);
    currentPlayer = "w";
    io.emit("boardState", chess.fen());
    io.emit("timerUpdate", timers); 
}

function startTimer(turn) {
    clearInterval(timerInterval);

    timerInterval = setInterval(() => {
        timers[turn]--;
        io.emit("timerUpdate", timers);

        if (timers[turn] <= 0) {
            clearInterval(timerInterval);
            const winner = turn === "w" ? "Black" : "White";
            io.emit("gameOver", { result: "timeout", winner });

            setTimeout(() => {
                resetGame();
                startTimer("w");
            }, 3000);
        }
    }, 1000);
}


app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
    res.render("index", { title: "Chess Game" });
});

io.on("connection", function (uniquesocket) {
    console.log("connected");

    
    if (!players.white) {
        players.white = uniquesocket.id;
        uniquesocket.emit("playerRole", "w");
    } else if (!players.black) {
        players.black = uniquesocket.id;
        uniquesocket.emit("playerRole", "b");
    } else {
        uniquesocket.emit("spectatorRole");
    }

    
    uniquesocket.on("disconnect", () => {
        console.log("disconnected")
        if (uniquesocket.id === players.white) {
            delete players.white;
        } else if (uniquesocket.id === players.black) {
            delete players.black;
        }
    });


    uniquesocket.on("move", (move) => {
        try {
            
            if (chess.turn() === "w" && uniquesocket.id !== players.white) return;
            if (chess.turn() === "b" && uniquesocket.id !== players.black) return;

            const result = chess.move(move);

            if (result) {
                currentPlayer = chess.turn();
                io.emit("move", move);
                io.emit("boardState", chess.fen());
                startTimer(chess.turn());

                
                if (chess.isCheckmate()) {
                    const winner = chess.turn() === "w" ? "Black" : "White";
                    io.emit("gameOver", { result: "checkmate", winner });

                    setTimeout(() => {
                        resetGame();
                        startTimer("w");
                    }, 3000);
                }
                
                else if (chess.isDraw() || chess.isStalemate() || chess.isThreefoldRepetition()) {
                    io.emit("gameOver", { result: "draw" });

                    setTimeout(() => {
                        resetGame();
                        startTimer("w");
                    }, 3000);
                }
            
                else if (chess.isCheck()) {
                    io.emit("check", { king: chess.turn() });
                }
            } else {
                uniquesocket.emit("InvalidMove", move);
                console.log("Invalid move:", move);
            }
        } catch (error) {
            console.log(error);
            uniquesocket.emit("InvalidMove", move);
        }
    });
});


server.listen(3000, function () {
    console.log("server is listening on http://localhost:3000 ");
});
