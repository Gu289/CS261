export default class Car{
    
    static SCALE = 0.02;
    static directions = {
        north: 3 * Math.PI / 2,
        east: 0,
        west: Math.PI,
        south: Math.PI / 2
    }

    static spawns = {
        north: {x: 310, y: 0},
        south: {x: 310, y: 600},
        east: {x: 600, y: 275},
        west: {x: 0, y: 275}
    }

    static junctions = {
        north: 230,
    }
    
    constructor(images, spawnCardinal, startDirection, endDirection){
        this.x = Car.spawns[spawnCardinal].x;
        this.y = Car.spawns[spawnCardinal].y;
        this.img = images[startDirection];
        this.images = images;
        this.width = this.img ? this.img.width * Car.SCALE : 0;
        this.height = this.img ? this.img.height * Car.SCALE : 0;
        this.speed = 1;
        this.waiting = false;
        this.spawnCardinal = spawnCardinal;
        this.direction = Car.directions[startDirection];
        this.endDirection = endDirection;
        this.junctionDistance = 0;
    }

   checkJunction(){
    if(this.spawnCardinal === "north" && this.y + this.height >= Car.junctions[this.spawnCardinal]){
        this.enterJunction();
    } else{
        this.move();
    }
   }

   updateSprite(){
    this.img = this.images[this.endDirection];
    this.width = this.img.width * Car.SCALE;
    this.height = this.img.height * Car.SCALE;
   }

   enterJunction(){
    if(this.junctionDistance < 120){
        this.move();
        this.junctionDistance += 1
    } else{
        this.updateSprite();
        this.direction = Car.directions[this.endDirection];
        this.move();
    }
   }

    move(){
        this.x += Math.cos(this.direction) * this.speed;
        this.y += Math.sin(this.direction) * this.speed;
    }

    draw(ctx){
        if(this.img.complete){
            ctx.drawImage(this.img, this.x, this.y, this.width, this.height);
        }
    }
}