export default class Car{

    static scale = 0.02;
    static speed = 1;
    static cars = [];
    static angles = [
        3 * Math.PI / 2, // facing north
        0, // facing east
        Math.PI / 2, // facing south
        Math.PI // facing
    ]

    static spawns = [
        {x: 310, y: 0}, // north
        {x: 600, y: 310}, // east
        {x: 247, y: 600}, // south
        {x: 0, y: 273} // west
    ]

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


    static bezier = {
        p0: {x:310, y:0},
        p1: {x:310, y:300},
        p2: {x:600, y:300},
    }

    constructor(images, spawnCardinal, endCardinal){
        this.spawnCardinal = Car.cardinalReferences[spawnCardinal];
        this.endDirection = Car.cardinalReferences[endCardinal];
        this.x = Car.spawns[this.spawnCardinal].x;
        this.y = Car.spawns[this.spawnCardinal].y;
        this.img = images;
        this.width = this.img.width * Car.scale;
        this.height = this.img.height * Car.scale;
        this.angle = Car.angles[(this.spawnCardinal + 2) % 4]
        Car.cars.push(this);
        this.id = Car.cars.length;
        this.waiting = false;
        this.t = 0;
    }

    move(){

        if(this.t < 1){
            const {x, y} = this.getBezierPoint(this.t, Car.bezier.p0, Car.bezier.p1, Car.bezier.p2);

            this.x = x;
            this.y = y;

            let nextT = this.t + 0.01;
            if (nextT > 1) {
                nextT = 1;
            }

            let {x: nextX, y: nextY} = this.getBezierPoint(nextT, Car.bezier.p0, Car.bezier.p1, Car.bezier.p2);
            this.angle = Math.atan2(nextY - y, nextX - x);
            this.t += 0.01;
        } else{
            this.x += Math.cos(this.angle) * Car.speed;
            this.y += Math.sin(this.angle) * Car.speed;
        }
    }
 
    getBezierPoint(t, P0, P1, P2){
        const x = (1 - t) ** 2 * P0.x + 2 * (1 - t) * t * P1.x + t ** 2 * P2.x;
        const y = (1 - t) ** 2 * P0.y + 2 * (1 - t) * t * P1.y + t ** 2 * P2.y;
        return { x, y };
    }

    draw(ctx){
        if(this.img.complete){
            ctx.save();
            ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
            ctx.rotate(this.angle);
            ctx.drawImage(this.img, -this.width / 2, -this.height / 2, this.width, this.height);
            ctx.restore();
        }
    }

}