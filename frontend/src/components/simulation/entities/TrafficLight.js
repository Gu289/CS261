export default class TrafficLight{

    constructor(images, cardinal){
        this.img = images
        this.cardinal = cardinal
        this.isRed = true
        this.x = 312 - 30
        this.y = 245 - 50
        this.width = this.img.width * 0.16
        this.height = this.img.height * 0.16
    }

    draw(ctx){
        if(this.img.complete){
            ctx.drawImage(this.img, this.x, this.y, this.width, this.height)
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