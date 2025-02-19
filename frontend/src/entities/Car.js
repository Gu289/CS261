export default class Car{
    constructor(x, y, image){
        this.x = x - 10;
        this.y = y;
        this.img = image;
        this.width = 0;
        this.height = 0;
        this.directionAngle = Math.PI / 2;
        this.speed = 1;
        this.turnSpeed = 0.05;
        this.isTurning = false;
        this.targetAngle = null;
        this.stoppingDistance = 50
        this.waiting = false;
        this.distanceMoved = 0;
        this.isRotating = false;
        this.spriteAngle = 0;
    }  

    static junctions = [
        {xRange: [500, 550], yRange: [250, 290]}, // North inbound junction coordinates
        {xRange: [309, 360], yRange: [245, 235]}
    ]
    // move(){
    //     this.y += 1;
    // }
    move() {
        
        if(!this.checkJunction() && !this.waiting){
            // Move forward in the direction the car is facing
            this.x += Math.cos(this.directionAngle) * this.speed;
            this.y += Math.sin(this.directionAngle) * this.speed;
        } else{
            this.waiting = true
        }
    }

    enterJunction(direction) {
        
        if(!this.waiting) return;

        if(this.waiting && this.distanceMoved === 0){
            this.speed = 1
        }

        if(this.distanceMoved < 105){
            this.y += this.speed;
            this.distanceMoved += this.speed;
        } else{
            this.speed = 0;
            this.rotate(direction);
        }
    }
    
    rotate(direction){

        if(direction === "left"){
            this.directionAngle -= Math.PI / 2
        } else if(direction === "right"){
            this.directionAngle += Math.PI / 2
        }

        if(this.targetAngle === null){
            this.targetAngle = 0;
        }
        if(this.targetAngle < 90){
            this.spriteAngle = 90;
            this.targetAngle = 90;
            this.isRotating = false;
            this.waiting = false;
            this.speed = 1;
        } else{
            this.targetAngle = 0;
            
            this.waiting = false;
            this.isRotating = false;
        }
    }
    

    checkJunction() {
        for (let junction of Car.junctions) {
            // Check if car is in the correct X range
            const inJunctionLane = this.x >= junction.xRange[0] && this.x <= junction.xRange[1];
    
            // Check if the car is about to reach the junction entry point in Y direction
            const approachingJunction = this.y + this.stoppingDistance >= junction.yRange[0] && this.y < junction.yRange[1];
    
            if (inJunctionLane && approachingJunction) {
                this.speed = 0; // Stop car at junction
                return true;
            }
        }
        return false;
    }

    // rotate(direction){
    //     if(direction == "right"){
    //         this.angle += this.turnSpeed;
    //     } else if (direction == "left"){
    //         this.angle -= this.turnSpeed;
    //     }
    // }

    draw(ctx){
        // if(this.img.complete){
        //     const scale = 0.02
        //     this.width = this.img.width * scale
        //     this.height = this.img.height * scale
            
        //     ctx.drawImage(this.img, this.x, this.y, this.width, this.height);
        // }
        if (this.img.complete) {
            const scale = 0.02;
            this.width = this.img.width * scale;
            this.height = this.img.height * scale;
            
            ctx.save();
            ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
            
            ctx.rotate((this.spriteAngle * Math.PI) / 180);
            
            ctx.drawImage(this.img, -this.width / 2, -this.height / 2, this.width, this.height);
            ctx.restore();
        }
    }

}