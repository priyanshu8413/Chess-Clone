


 const socket=io()


const chess= new Chess() 


 const boardElement= document.querySelector(".chessboard")
 const whiteTimerEl = document.createElement("div");
const blackTimerEl = document.createElement("div");
whiteTimerEl.style.color = "black";
blackTimerEl.style.color = "black";
document.body.appendChild(whiteTimerEl);
document.body.appendChild(blackTimerEl);

const notificationContainer = document.createElement("div");
notificationContainer.classList.add("notification-container");
document.body.appendChild(notificationContainer);


function showNotification(message, type = "info") {
    const notif = document.createElement("div");
    notif.classList.add("notification", type);
    notif.textContent = message;

    notificationContainer.appendChild(notif);

   
    setTimeout(() => {
        notif.classList.add("fade-out");
        setTimeout(() => notif.remove(), 500);
    }, 5000);
}


 let draggedPiece=null;
 let sourceSquare=null;
 let playerRole=null;
const getPossibleMoves = (row, col) => {
    const from = `${String.fromCharCode(97 + col)}${8 - row}`; 
    const moves = chess.moves({ square: from, verbose: true }); 
    return moves.map(m => m.to); 
}
 const renderBoard=() =>{
    const board= chess.board()
    console.log(board)
    boardElement.innerHTML=""
    board.forEach((row,rowindex)=> {
        row.forEach((square,squareIndex)=>{
         const squareElement=document.createElement("div");
         squareElement.classList.add("square",
            (rowindex + squareIndex) %2 == 0 ? "light" :"dark"
         )
         squareElement.dataset.row = rowindex;
         squareElement.dataset.col= squareIndex;
         if(square){
            const pieceElement = document.createElement("div");
            pieceElement.classList.add("piece",square.color==='w'?"white":"black")
              pieceElement.innerText=getPieceUnicode(square)
         pieceElement.draggable=playerRole=== square.color;
         pieceElement.addEventListener("dragstart",(e)=>{
            if(pieceElement.draggable){
                draggedPiece=pieceElement;
                sourceSquare={row:rowindex,col:squareIndex}
                e.dataTransfer.setData("text/plain","");
                 const possibleSquares = getPossibleMoves(rowindex, squareIndex);
                possibleSquares.forEach(to => {
            const toRow = 8 - parseInt(to[1]);
            const toCol = to.charCodeAt(0) - 97;
            const squareEl = document.querySelector(`.square[data-row='${toRow}'][data-col='${toCol}']`);
            if(squareEl) squareEl.classList.add("highlight");
        })
            }
         })
         pieceElement.addEventListener("draggend",(e)=>{
            draggedPiece=null
            sourceSquare=null  
                document.querySelectorAll(".square.highlight").forEach(sq => sq.classList.remove("highlight"));      
        })
        squareElement.appendChild(pieceElement)
         }
       
        squareElement.addEventListener("dragover",function(e){
            e.preventDefault();
        })
  squareElement.addEventListener("drop",function(e){
    e.preventDefault()
    if(draggedPiece){
       const targetSource= {
        row:parseInt(squareElement.dataset.row),
        col:parseInt(squareElement.dataset.col),
       } 
       handleMove(sourceSquare,targetSource)
    }
  })
   boardElement.appendChild(squareElement)
        

        })
         
    });
    if(playerRole==='b'){
        boardElement.classList.add("flipped")
    }
    else{
      boardElement.classList.remove("flipped");  
    }
  

 }
 

 const handleMove = (source,target)=>{
    const move = {
        from:`${String.fromCharCode(97+source.col)}${8-source.row}` ,
        to: `${String.fromCharCode(97+target.col)}${8-target.row}`,
        promotion:'q'
    }
    socket.emit("move",move)
 }

 const getPieceUnicode = (piece) => {
  

  const unicodePieces = {
    p: { w: "♙", b: "♟" },
    r: { w: "♖", b: "♜" },
    n: { w: "♘", b: "♞" },
    b: { w: "♗", b: "♝" },
    q: { w: "♕", b: "♛" },
    k: { w: "♔", b: "♚" },
  };

  return unicodePieces[piece.type][piece.color];
};
socket.on("playerRole",function(role){
playerRole=role;
renderBoard()
})
socket.on("spectatorRole",function(){
playerRole=null;
renderBoard()
})
socket.on("boardState", function(fen) {
  chess.load(fen);   
  renderBoard();
});
socket.on("InvalidMove", function(move){
    showNotification("Invalid move! Try again.", "error");
});

socket.on("move", function(move) {
  chess.move(move);  
  renderBoard();
});
socket.on("gameOver", (data) => {
    if (data.result === "checkmate") {
        showNotification(`${data.winner} wins by Checkmate!`, "success");
    } else if (data.result === "draw") {
        showNotification("Game Draw!", "warning");
    } else if (data.result === "timeout") {
        showNotification(`${data.winner} wins on Time!`, "error");
    }
    else if (data.result === "check") {
        showNotification(`Check! ${data.check === "w" ? "White" : "Black"} king is in danger!`, "warning");
    }
});

socket.on("check", function(data) {
    const kingColor = data.king === "w" ? "White" : "Black";
    showNotification(`Check! ${kingColor} king is in danger!`, "warning");
});



socket.on("timerUpdate", timers => {
    whiteTimerEl.textContent = `White: ${formatTime(timers.w)}`;
    blackTimerEl.textContent = `Black: ${formatTime(timers.b)}`;
});

function formatTime(seconds){
    const m = Math.floor(seconds / 60).toString().padStart(2,'0');
    const s = (seconds % 60).toString().padStart(2,'0');
    return `${m}:${s}`;
}

socket.on("timerUpdate", timers => {
    whiteTimerEl.textContent = `White: ${formatTime(timers.w)}`;
    blackTimerEl.textContent = `Black: ${formatTime(timers.b)}`;
});

 renderBoard()





 