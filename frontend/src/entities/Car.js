export default class Car{
    constructor(x, y, image){
        this.x = x;
        this.y = y;
        this.img = image;
        this.width = 0;
        this.height = 0;
    }

    move(){
        this.y += 1;
    }

    draw(ctx){
        if(this.img.complete){
            const scale = 0.025
            this.width = this.img.width * scale
            this.height = this.img.height * scale
            
            ctx.drawImage(this.img, this.x, this.y, this.width, this.height);
        }
    }
}