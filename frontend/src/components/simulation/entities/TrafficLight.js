export default class TrafficLight{

    static instances = []

    static positions = {
        0: {x: 311, y: 238, angle:0, isRed: true}, // north traffic light
        1: {x: 338, y: 328, angle:Math.PI / 2, isRed: false}, // east traffic light
        2: {x: 246, y: 356, angle:0, isRed: true}, // south traffic light
        3: {x: 220, y: 265, angle:Math.PI / 2, isRed: false}
    }


    constructor(images, cardinal){
        this.images = images
        this.cardinal = cardinal
        this.isRed = TrafficLight.positions[this.cardinal].isRed
        this.img = this.isRed ? this.images.red : this.images.green; 
        this.x = TrafficLight.positions[this.cardinal].x
        this.y = TrafficLight.positions[this.cardinal].y
        this.width = this.img.width * 0.14
        this.height = this.img.height * 0.14
        TrafficLight.instances.push(this)
        setInterval(this.toggleLight.bind(this), 10000);
    }

    toggleLight(){
        this.isRed = !this.isRed;
        this.img = this.isRed ? this.images.red : this.images.green; 
    }

    draw(ctx){
        if(this.img.complete){
            ctx.save(); // Save current state

            // Move origin to the center of the traffic light
            const centerX = this.x + this.width / 2;
            const centerY = this.y + this.height / 2;
            ctx.translate(centerX, centerY);

            // Rotate based on cardinal direction
            
            ctx.rotate(TrafficLight.positions[this.cardinal].angle);

            // Draw the image centered
            ctx.drawImage(this.img, -this.width / 2, -this.height / 2, this.width, this.height);

            ctx.restore(); // Restore original state
        }
    }

}

/**
 * make traffic lights object
 * positionate traffic lights
 * add traffic light red and green images
 * show traffic light state in simulation
 * add logic for cars to wait for green light
 * add car collision logic
 * 
 */