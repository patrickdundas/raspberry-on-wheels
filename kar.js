var http = require('http').createServer(handler); //require http server, and create server with function handler()
var fs = require('fs'); //require filesystem module
var io = require('socket.io')(http) //require socket.io module and pass the http object (server)

// var Motor = require("pi-motor");
// var leftSide = new Motor(16,18,22);
// var rightSide = new Motor(36,24,26);

var rpio = require('rpio');

/*
LEFT SIDE MOTOR CONTROL
*/
rpio.open(16, rpio.OUTPUT, rpio.LOW);
rpio.open(18, rpio.OUTPUT, rpio.LOW);
rpio.open(22, rpio.OUTPUT, rpio.LOW);

/*
RIGHT SIDE MOTOR CONTROL
*/
rpio.open(36, rpio.OUTPUT, rpio.LOW);
rpio.open(24, rpio.OUTPUT, rpio.LOW);
rpio.open(26, rpio.OUTPUT, rpio.LOW);

// /*
// FRONT SENSOR
// */
// //trigger
// var triggerPin = 38;
// rpio.open(triggerPin, rpio.OUTPUT, rpio.HIGH);
// //echo
// var echoPin = 40;
// rpio.open(echoPin, rpio.INPUT, rpio.HIGH)


http.listen(8080); //listen to port 8080

var minimumSafeDistance = 20;
var safetyCheckTime = 500;
var currentFrontDistance = 1000;

var distanceSensorPath = 'distanceSensor.py';

const {PythonShell} = require('python-shell');

function getDistance(){
  var distanceSensor = new PythonShell(distanceSensorPath);
  var foundData;

  return new Promise(function(resolve,reject){
    distanceSensor.on('message', function(message){
      //console.log(message)
      var data = JSON.parse(message);
      resolve(data);
    })

    distanceSensor.end(function(err){
      if(err){
        reject(err);
      };
    });
  });



}

setInterval(function(){
  var distanceGetter = getDistance();
  distanceGetter.then(function(result){
    console.log("Recieved sensor data: "+JSON.stringify(result));
    currentFrontDistance = result['front-distance'];
  });
},1000);

// function measureDistance(){
//   rpio.write(triggerPin, rpio.HIGH);
//   setTimeout(function(){
//     GPIO.output(triggerPin, rpio.LOW)
//   },1);
//
//   startTime = 0;
//   stopTime = 0;
// }

function stopAll(){
  console.log("BRAKE")
  rpio.write(36, rpio.LOW);
  rpio.write(24, rpio.LOW);
  rpio.write(26, rpio.LOW);
  rpio.write(16, rpio.LOW);
  rpio.write(18, rpio.LOW);
  rpio.write(22, rpio.LOW);
}
function runSide(side, direction){
  console.log(side + " " + direction)
  var pin1 = 0;
  var pin2 = 0;
  var pin3 = 0;
  if(side == "left"){
    pin1 = 36;
    pin2 = 24;
    pin3 = 26;
  }
  if(side == "right"){
    pin1 = 16;
    pin2 = 18;
    pin3 = 22;
  }
  if(direction == "forward"){
    rpio.write(pin1, rpio.HIGH);
    rpio.write(pin3, rpio.HIGH);
  }
  if(direction == "backward"){
    rpio.write(pin2, rpio.HIGH);
    rpio.write(pin3, rpio.HIGH);
  }
  if(direction == "stop"){
    rpio.write(pin1, rpio.LOW);
    rpio.write(pin2, rpio.LOW);
    rpio.write(pin3, rpio.LOW);
  }


  // if(status){
  //   rpio.write(36, rpio.HIGH);
  //   //rpio.write(34, rpio.HIGH);
  //   rpio.write(26, rpio.HIGH);
  // }
  // else{
  //   rpio.write(36, rpio.LOW);
  //   //rpio.write(34, rpio.HIGH);
  //   rpio.write(26, rpio.LOW);
  // }

}
function handler (req, res) { //create server
  fs.readFile(__dirname + '/public/index.html', function(err, data) { //read file index.html in public folder
    if (err) {
      res.writeHead(404, {'Content-Type': 'text/html'}); //display 404 on error
      return res.end("404 Not Found");
    }
    res.writeHead(200, {'Content-Type': 'text/html'}); //write HTML
    res.write(data); //write data from index.html
    return res.end();
  });
}

var safetyCheck = null;
io.sockets.on('connection', function (socket) {// WebSocket Connection
  socket.on('forward', function(data) {
    if(currentFrontDistance < minimumSafeDistance){
      stopAll();
    }
    else{
      stopAll();
      runSide("left","forward");
      runSide("right","forward");
    }
    if(safetyCheck == null){
      console.log('init safety check');
      safetyCheck = setInterval(function(){
        if(currentFrontDistance < minimumSafeDistance){
          stopAll();
          console.log("UNSAFE FRONT DISTANCE - MOTORS STOPPED")
        }
      },safetyCheckTime);
    }

    // if(movingForward){
    //   rpio.write(26, rpio.LOW);
    //   rpio.write(22, rpio.LOW);
    //   movingForward = false;
    //   console.log("Stopped")
    // }
    // else{
    //   rpio.write(36, rpio.HIGH);
    //   //rpio.write(34, rpio.HIGH);
    //   rpio.write(26, rpio.HIGH);
    //   rpio.write(16, rpio.HIGH);
    //   //rpio.write(18, rpio.HIGH);
    //   rpio.write(22, rpio.HIGH);
    //   console.log("FORWARD")
    //   movingForward = true;
    // }

  });
  socket.on("left", function(data) {
    stopAll();
    runSide("left", "forward");
    runSide("right", "backward");
  });
  socket.on("right", function(data) {
    stopAll();
    runSide("right", "forward");
    runSide("left", "backward");
  });
  socket.on("backward", function(data){
    //stop front safety check
    clearInterval(safetyCheck);
    safetyCheck = null;
    stopAll();
    runSide("right", "backward");
    runSide("left", "backward");
  })

  socket.on("stop", function(data) {
    stopAll();
    runSide("left", "stop");
    runSide("right", "stop");
  });

});

process.on('SIGINT', function () { //on ctrl+c
  rpio.write(22, rpio.LOW);
  rpio.write(26, rpio.LOW);
  process.exit(); //exit completely
});
