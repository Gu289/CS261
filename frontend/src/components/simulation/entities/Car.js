export default class Car{
    
    static SCALE = 0.02;
    static speed = 1;
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
        this.junctionDistance = null;
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
    enterJunction() {
        if (this.junctionDistance === null) {
            // Determine the required distance to travel before turning
            const diff = (this.endDirection - this.spawnCardinal + 4) % 4;
            if (diff === 1) {
                this.junctionDistance = Car.limits.short;
            } else if (diff === 2) {
                this.junctionDistance = Car.limits.opposite;
            } else {
                this.junctionDistance = Car.limits.long;
            }
        }

        // Move the car forward while scaling the speed correctly
        if (this.junctionDistance > 0) {
            this.junctionDistance -= Car.speed; // Decrease remaining distance
            this.move();
        } else {
            // Car has reached the turn point, update its direction
            this.updateSprite();
            this.direction = Car.directions[this.endDirection];
            this.move();
        }
    }

   // move the car to the direction it is facing
    move(){
        this.x += Math.cos(this.direction) * Car.speed;
        this.y += Math.sin(this.direction) * Car.speed;
    }

    // render the car sprite
    draw(ctx){
        if(this.img.complete){
            ctx.drawImage(this.img, this.x, this.y, this.width, this.height);
        }
    }
}