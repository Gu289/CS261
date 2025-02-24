export default class Car{
    
    static SCALE = 0.02;

    static directions = [
        3 * Math.PI / 2, // facing north
        0, // facing east
        Math.PI / 2, // facing south
        Math.PI // facing west
    ]

    static spawns = [
        {x: 310, y: 0}, // north
        {x: 600, y: 310}, // east
        {x: 247, y: 600}, // south
        {x: 0, y: 273} // west
    ]

    static junctionStops = [
        233, // north
        363, // east
        365, // south
        230 // west
    ]

    static limits = {
        short: 55, // turning left
        long: 115, // turning right
        opposite: 0 // going straight
    }

    static cardinalReferences = {
        north: 0,
        east: 1,
        south: 2,
        west: 3,
        0: "north",
        1: "east",
        2: "south",
        3: "west"
    }
    
    constructor(images, spawnCardinal, endDirection){
        this.spawnCardinal = Car.cardinalReferences[spawnCardinal];
        this.endDirection = Car.cardinalReferences[endDirection];
        this.x = Car.spawns[this.spawnCardinal].x;
        this.y = Car.spawns[this.spawnCardinal].y;
        this.img = images[Car.cardinalReferences[(this.spawnCardinal + 2) % 4]];
        this.images = images;
        this.width = this.img ? this.img.width * Car.SCALE : 0;
        this.height = this.img ? this.img.height * Car.SCALE : 0;
        this.speed = 1;
        this.waiting = false;
        this.direction = Car.directions[(this.spawnCardinal + 2) % 4];
        this.junctionDistance = 0;
    }

    // checks if car has reached the junction 
   checkJunction(){
    // check if car spawning north has reached the stopping line
    if(this.spawnCardinal === 0 && this.y + this.height >= Car.junctionStops[this.spawnCardinal]){
        this.enterJunction();
    } 
    else if(this.spawnCardinal === 3 && this.x + this.width >= Car.junctionStops[this.spawnCardinal]){
        this.enterJunction();
    } 
    else if(this.spawnCardinal === 1 && this.x <= Car.junctionStops[this.spawnCardinal]){
        this.enterJunction();
    }
    else if(this.spawnCardinal === 2 && this.y <= Car.junctionStops[this.spawnCardinal]){
        this.enterJunction();
    }
    else{
        this.move();
    }
   }

   // updates the sprite of the car after changing direction
   updateSprite(){
    this.img = this.images[Car.cardinalReferences[this.endDirection]];
    this.width = this.img.width * Car.SCALE;
    this.height = this.img.height * Car.SCALE;
   }

   // moves the car in the junction and updates the sprite and direction
   enterJunction(){

    let distance = 0;
    // check if car needs to turn left, right or go straight
    // const diff = Math.abs((this.spawnCardinal - this.endDirection) % 4);
    const diff = (this.endDirection - this.spawnCardinal + 4) % 4
        if(diff === 1){
            distance = Car.limits.short;
        } else if(diff === 2){
            distance = Car.limits.opposite;
        } else{
            distance = Car.limits.long;
        }

    if(this.junctionDistance < distance){
        this.move();
        this.junctionDistance += 1
    } else{
        this.updateSprite();
        this.direction = Car.directions[this.endDirection];
        this.move();
    }
   }

   // move the car to the direction it is facing
    move(){
        this.x += Math.cos(this.direction) * this.speed;
        this.y += Math.sin(this.direction) * this.speed;
    }

    // render the car sprite
    draw(ctx){
        if(this.img.complete){
            ctx.drawImage(this.img, this.x, this.y, this.width, this.height);
        }
    }
}