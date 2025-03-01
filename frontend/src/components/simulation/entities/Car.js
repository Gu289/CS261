import TrafficLight from "./TrafficLight";

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
        225, // north
        370, // east
        375, // south
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
        "00": {x: 327, y: 0}, // north left turns
        "01": {x: 300, y: 0}, // north second right turns
        "10": {x: 600, y: 336}, // east left turns
        "11": {x: 600, y: 310}, // east right turns
        "20": {x: 237, y:600}, // south left turns
        "21": {x: 265, y:600}, // south right turns
        "30": {x: 0, y: 248}, // west left turns
        "31": {x: 0, y: 273} // west right turns

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

    

    constructor(images, spawnCardinal, endDirection){
        this.spawnCardinal = Car.cardinalReferences[spawnCardinal];
        this.endDirection = Car.cardinalReferences[endDirection];
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
        this.isOut = false;
        this.t = 0;
    }

    static bezierCurves = {
        "0-1": {p0: {x:327, y:225}, p1: {x:327, y:248}, p2: {x:360, y:248}}, // curve north left turn to east
        "0-3": {p0: {x:300, y:225}, p1: {x:300, y:335}, p2: {x:240, y:335}}, // curve north right turn to west
        "1-2": {p0: {x:370, y:336}, p1: {x:327, y:336}, p2: {x:327, y:360}}, // curve east left turn to south
        "1-0": {p0: {x:370, y:310}, p1: {x:265, y:310}, p2: {x:265, y:240}}, // curve east right turn to north
        "2-3": {p0: {x:237, y:375}, p1: {x:237, y:335}, p2: {x:227, y:335}}, // curve south left turn to west
        "2-1": {p0: {x:265, y:375}, p1: {x:265, y:273}, p2: {x:365, y:273}}, // curve south right turn to east
        "3-0": {p0: {x:194, y:248}, p1: {x:238, y:248}, p2: {x:238, y:240}}, // curve west left turn to north
        "3-2": {p0: {x:194, y:273}, p1: {x:300, y:273}, p2: {x:300, y:360}} // curve west left turn to south
    }

    chooseSpawn(){

        if((this.spawnCardinal - 1) % 4 === this.endDirection){ // right turn
            this.x = Car.spawns[`${this.spawnCardinal}1`].x // second lane (left one)
            this.y = Car.spawns[`${this.spawnCardinal}1`].y
        } else if((this.spawnCardinal + 1) % 4 === this.endDirection){ // left turn
            this.x = Car.spawns[`${this.spawnCardinal}0`].x // first lane (right one)   
            this.y = Car.spawns[`${this.spawnCardinal}0`].y
        } else{
            const random = Math.floor(Math.random() * 2) // need to change 2 (number of lanes)
            this.x = Car.spawns[`${this.spawnCardinal}${random}`].x
            this.y = Car.spawns[`${this.spawnCardinal}${random}`].y
        }
    }

    updateCar(){

        if(this.isTurning || this.isOut){
            this.move();
            return;
        }

        if(
            (this.spawnCardinal === 0 && this.y + this.height >= Car.stopLines[this.spawnCardinal]) ||
            (this.spawnCardinal === 1 && this.x <= Car.stopLines[this.spawnCardinal]) ||
            (this.spawnCardinal === 2 && this.y <= Car.stopLines[this.spawnCardinal]) ||
            (this.spawnCardinal === 3 && this.x + this.width >= Car.stopLines[this.spawnCardinal])
        ){ 
            if(TrafficLight.instances.some(light => {
                return light.cardinal === this.spawnCardinal && !light.isRed
            })){
                this.isTurning = true
                this.isOut = true
            } else{
                return;
            }
        }
        this.move();
    }

    move(){
        if(this.t < 1 && this.isTurning && (this.spawnCardinal + 2) % 4 !== this.endDirection){

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

            if((this.spawnCardinal + 2) % 4 !== this.endDirection){
                // this.drawBezier(ctx);
            }
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