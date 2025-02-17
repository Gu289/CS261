export default class Car{
    constructor(x, y, image){
        this.x = x - 10;
        this.y = y;
        this.img = image;
        this.width = 0;
        this.height = 0;
        this.angle = Math.PI / 2;
        this.speed = 1;
        this.turnSpeed = 0.05;
        this.isTurning = false;
        this.targetAngle = null;
        this.stoppingDistance = 50
    }  

    static junctions = [
        {xRange: [500, 550], yRange: [250, 290]} // North inbound junction coordinates
    ]
    // move(){
    //     this.y += 1;
    // }
    move() {
        
        if(!this.checkJunction()){
            // Move forward in the direction the car is facing
            this.x += Math.cos(this.angle) * this.speed;
            this.y += Math.sin(this.angle) * this.speed;
        }
        console.log(this.y);
        
    }

    turn(direction) {
        if (this.isTurning) return; // Prevent multiple turns at once
        this.isTurning = true;

        // Move forward by 90 units first
        let initialMove = setInterval(() => {
            this.y += this.speed;
            if (this.y % 90 === 0) {
                clearInterval(initialMove);
                this.startRotation(direction);
            }
        }, 16);
    }

    startRotation(direction) {
        const rotationSpeed = 0.05; // Adjust for smoothness

        if (direction === "right") {
            this.targetAngle += Math.PI / 2;
        } else if (direction === "left") {
            this.targetAngle -= Math.PI / 2;
        }

        let rotateAnimation = setInterval(() => {
            if (Math.abs(this.angle - this.targetAngle) > 0.05) {
                this.angle += direction === "right" ? rotationSpeed : -rotationSpeed;
            } else {
                this.angle = this.targetAngle; // Snap to exact angle
                clearInterval(rotateAnimation);
                this.isTurning = false;
            }
        }, 16);
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
        if(this.img.complete){
            const scale = 0.02
            this.width = this.img.width * scale
            this.height = this.img.height * scale
            
            ctx.drawImage(this.img, this.x, this.y, this.width, this.height);
        }
        // if (this.img.complete) {
        //     const scale = 0.025;
        //     this.width = this.img.width * scale;
        //     this.height = this.img.height * scale;

        //     ctx.save(); // Save current state

        //     // Move the canvas to the car's center
        //     ctx.translate(this.x + this.width / 2, this.y + this.height / 2);

        //     // Rotate the canvas
        //     ctx.rotate(this.angle);

        //     // Draw the image centered at the new position
        //     ctx.drawImage(this.img, -this.width / 2, -this.height / 2, this.width, this.height);

        //     ctx.restore(); // Restore canvas state to prevent affecting other drawings
        // }
    }

}