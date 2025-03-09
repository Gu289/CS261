export default class TrafficLight{

    static instances = []
    static currentPhase = 0;
    static positions = {
        0: {x: 311, y: 238, angle:0, isRed: false}, // north traffic light
        1: {x: 338, y: 328, angle:Math.PI / 2, isRed: true}, // east traffic light
        2: {x: 246, y: 356, angle:0, isRed: false}, // south traffic light
        3: {x: 220, y: 265, angle:Math.PI / 2, isRed: true}
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
        // setInterval(this.toggleLight.bind(this), 10000);
    }

    setLight(isRed) {
        this.isRed = isRed;
        this.img = isRed ? this.images.red : this.images.green;
    }

    static toggleLights() {
        // Phase 0: NS Green, EW Red → Phase 1: All Red → Phase 2: EW Green, NS Red
        if (TrafficLight.currentPhase === 0) {
            TrafficLight.instances.forEach(light => light.setLight(true)); // All Red
            TrafficLight.currentPhase = 1;

            setTimeout(() => {
                TrafficLight.instances.forEach(light => {
                    if (light.cardinal % 2 !== 0) light.setLight(false); // EW Green
                });
                TrafficLight.currentPhase = 2;
            }, 3000); // 3-second delay before turning green

        } else if (TrafficLight.currentPhase === 2) {
            TrafficLight.instances.forEach(light => light.setLight(true)); // All Red
            TrafficLight.currentPhase = 1;

            setTimeout(() => {
                TrafficLight.instances.forEach(light => {
                    if (light.cardinal % 2 === 0) light.setLight(false); // NS Green
                });
                TrafficLight.currentPhase = 0;
            }, 3000);
        }
    }

    // toggleLight(){

    //     if(this.isRed){
    //         this.isRed = false;
    //         this.img = this.images.green;
    //     } else{
    //         this.isRed = true;
    //         this.img = this.images.red;

    //         setTimeout(() => {
    //             TrafficLight.instances.forEach(light => {
    //                 if(light.cardinal === (this.cardinal + 2) % 4 && light.isRed){
    //                     light.isRed = false
    //                     light.img = light.images.green
    //                 }
    //             })
    //         }, 3000)
    //     }

    //     this.isRed = !this.isRed;
    //     this.img = this.isRed ? this.images.red : this.images.green; 
    // }

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
