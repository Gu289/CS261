export default class Car{

    static scale = 0.02;
    static speed = 1;
    static cars = [];
    static angles = [
        3 * Math.PI / 2, // facing north
        0, // facing east
        Math.PI / 2, // facing south
        Math.PI // facing west
    ]

    static stopLines = [
        233, // north
        363, // east
        365, // south
        230 // west
    ]

    // static spawns = [
    //     // {x: 327, y: 0}, // north-right
    //     {x: 300, y: 0}, // north-left
    //     {x: 600, y: 310}, // east
    //     {x: 247, y: 600}, // south
    //     {x: 0, y: 273} // west
    // ]

    static spawns = {
        "00": {x: 300, y: 0}, // north first lane 
        "01": {x: 327, y: 0}, // north second lane
        "11": {x: 600, y: 310}, // east
        "22": {x: 247, y: 600}, // south
        "33": {x: 0, y: 273} // west
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


    // static bezier = {
    //     p0: {x:327, y:215},
    //     p1: {x:327, y:248},
    //     p2: {x:360, y:248},
    // }

    static bezierCurves = {
        "0-1": {p0: {x:327, y:215}, p1: {x:327, y:248}, p2: {x:360, y:248}},
        "0-3": {p0: {x:300, y:215}, p1: {x:300, y:335}, p2: {x:240, y:335}}
    }

    constructor(images, spawnCardinal, endCardinal){
        this.spawnCardinal = Car.cardinalReferences[spawnCardinal];
        this.endDirection = Car.cardinalReferences[endCardinal];
        // this.x = Car.spawns[this.spawnCardinal].x;
        this.x = 0
        this.y = 0
        this.chooseSpawn()
        this.img = images;
        this.width = this.img.width * Car.scale;
        this.height = this.img.height * Car.scale;
        this.angle = Car.angles[(this.spawnCardinal + 2) % 4]
        Car.cars.push(this);
        this.id = Car.cars.length;
        this.waiting = false;
        this.isTurning = false;
        this.t = 0;
    }

    chooseSpawn(){
        if(this.spawnCardinal + this.endCardinal % 4 === 1){ // right turn
            this.x = Car.spawns[`${this.spawnCardinal}1`].x // second lane
            this.y = Car.spawns[`${this.spawnCardinal}1`].y
        } else if(this.spawnCardinal + this.endCardinal % 4 === 3){ // left turn
            this.x = Car.spawns[`${this.spawnCardinal}0`].x // first lane
            this.y = Car.spawns[`${this.spawnCardinal}0`].y
        } else{
            const random = Math.floor(Math.random() * 2) // need to change 2 (number of lanes)
            console.log(random);
            this.x = Car.spawns[`${this.spawnCardinal}${random}`].x
            this.y = Car.spawns[`${this.spawnCardinal}${random}`].y
        }
    }

    updateCar(){
        if(this.spawnCardinal === 0 && this.y + this.height >= Car.stopLines[this.spawnCardinal]){
            this.isTurning = true;
        }
        this.move();
    }

    move(){

        if(this.t < 1 && this.isTurning){

            const curve = Car.bezierCurves[`${this.spawnCardinal}-${this.endDirection}`];

            const {x, y} = this.getBezierPoint(this.t, curve.p0, curve.p1, curve.p2);

            this.x = x;
            this.y = y;

            let nextT = this.t + Car.speed / 100;
            if (nextT > 1) {
                nextT = 1;
            }

            let {x: nextX, y: nextY} = this.getBezierPoint(nextT, curve.p0, curve.p1, curve.p2);
            this.angle = Math.atan2(nextY - y, nextX - x);
            this.t += Car.speed / 100;
            
            if (this.t >= 1) {
                this.x = curve.p2.x;
                this.y = curve.p2.y;
    
                // 🔥 Snap the angle to a perfect direction
                if (this.endDirection === 3) this.angle = Math.PI; // Left (west)
                else if (this.endDirection === 1) this.angle = 0;   // Right (east)
                else if (this.endDirection === 2) this.angle = Math.PI / 2;  // Down (south)
                else if (this.endDirection === 0) this.angle = -Math.PI / 2; // Up (north)
    
                this.isTurning = false; // Exit turning state
            }
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

            this.drawBezier(ctx);
        }
    }

    drawBezier(ctx){

        const curve = Car.bezierCurves[`${this.spawnCardinal}-${this.endDirection}`];

        this.drawDot(ctx, curve.p0.x, curve.p0.y);
        this.drawDot(ctx, curve.p1.x, curve.p1.y);
        this.drawDot(ctx, curve.p2.x, curve.p2.y);
    }

    drawDot(ctx, x, y){
        ctx.fillStyle = "black";
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
    }

}